import { chromium } from "playwright-core";

// Tipos dos dados que o scraper retorna
export interface ProdutoScrapado {
  asin?: string;
  titulo: string;
  preco: number | null;
  precoOriginal: number | null;
  descontoPercentual: number | null;
  avaliacao: number | null;
  numAvaliacoes: number | null;
  freteGratis: boolean;
  isPrime: boolean;
  imagemUrl: string;
  urlProduto: string;
  loja: "amazon" | "mercadolivre";
}

// Lista de User-Agents realistas para variar
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];

function obterUserAgentAleatorio(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Pausa aleatória para simular comportamento humano
function esperar(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.random() * (maxMs - minMs) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry com backoff exponencial
async function comRetry<T>(
  fn: () => Promise<T>,
  maxTentativas: number = 3,
  delay: number = 1000
): Promise<T> {
  let ultimoErro: any;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      return await fn();
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa < maxTentativas) {
        const delayMs = delay * Math.pow(2, tentativa - 1); // Exponential backoff
        console.log(
          `[Retry] Tentativa ${tentativa} falhou, aguardando ${delayMs}ms...`
        );
        await esperar(delayMs, delayMs + 500);
      }
    }
  }

  throw ultimoErro;
}

// Converte texto de preço "1.234,56" para número 1234.56
function parsePreco(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const limpo = texto
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const numero = parseFloat(limpo);
  return isNaN(numero) ? null : numero;
}

export async function buscarAmazon(
  termo: string,
  numPaginas: number = 2
): Promise<ProdutoScrapado[]> {
  console.log(`[Amazon] Buscando: "${termo}" em ${numPaginas} página(s)`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1920, height: 1080 },
    extraHTTPHeaders: {
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
  });

  // Remove o flag webdriver que identifica automação
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, "languages", {
      get: () => ["pt-BR", "pt", "en"],
    });
  });

  const produtos: ProdutoScrapado[] = [];

  try {
    const page = await context.newPage();

    // Bloqueia recursos desnecessários para carregar mais rápido
    await page.route(
      /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|css)$/,
      (route) => route.abort()
    );
    await page.route(/analytics|tracking|doubleclick|facebook/, (route) =>
      route.abort()
    );

    for (let pagina = 1; pagina <= numPaginas; pagina++) {
      try {
        console.log(`[Amazon] Página ${pagina}/${numPaginas}...`);

        const url = `https://www.amazon.com.br/s?k=${encodeURIComponent(termo)}&page=${pagina}&language=pt_BR`;

        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        // Espera os produtos aparecerem
        try {
          await page.waitForSelector(
            '[data-component-type="s-search-result"]',
            { timeout: 10000 }
          );
        } catch {
          console.log(`[Amazon] Timeout na página ${pagina} - pulando`);
          continue;
        }

        // Scroll gradual para simular humano
        for (let i = 1; i <= 3; i++) {
          await page.evaluate(
            (fator) =>
              window.scrollTo(0, document.body.scrollHeight * fator),
            i / 3
          );
          await esperar(400, 800);
        }

        // Extrai dados dos produtos via page.evaluate (roda dentro do browser)
        const produtosDaPagina = await page.evaluate(() => {
          const items = document.querySelectorAll(
            '[data-component-type="s-search-result"]'
          );
          const resultados: any[] = [];

          items.forEach((item) => {
            try {
              // Título
              const titulo = item.querySelector("h2")?.textContent?.trim();
              if (!titulo) return;

              // ASIN
              const asin = item.getAttribute("data-asin") || undefined;

              // Preço inteiro e fração
              const precoInteiroEl = item.querySelector(".a-price-whole");
              const precoFracaoEl = item.querySelector(".a-price-fraction");
              let preco: number | null = null;
              if (precoInteiroEl) {
                const inteiro = precoInteiroEl.textContent
                  ?.replace(/\./g, "")
                  .replace(",", "")
                  .trim();
                const fracao = precoFracaoEl?.textContent?.trim() || "00";
                preco = parseFloat(`${inteiro}.${fracao}`);
                if (isNaN(preco)) preco = null;
              }

              // Preço original (riscado)
              let precoOriginal: number | null = null;
              const precoRiscado = item.querySelector(".a-text-price");
              if (precoRiscado) {
                const texto = precoRiscado.textContent
                  ?.replace("R$", "")
                  .replace(/\./g, "")
                  .replace(",", ".")
                  .trim();
                precoOriginal = texto ? parseFloat(texto) : null;
                if (isNaN(precoOriginal!)) precoOriginal = null;
              }

              // Desconto
              let descontoPercentual: number | null = null;
              if (preco && precoOriginal && precoOriginal > preco) {
                descontoPercentual = Math.round(
                  (1 - preco / precoOriginal) * 100
                );
              }

              // Avaliação
              let avaliacao: number | null = null;
              const estrelasEl = item.querySelector(".a-icon-alt");
              if (estrelasEl) {
                const texto = estrelasEl.textContent?.split(" ")[0].replace(",", ".");
                avaliacao = texto ? parseFloat(texto) : null;
                if (isNaN(avaliacao!)) avaliacao = null;
              }

              // Número de avaliações
              let numAvaliacoes: number | null = null;
              const contadorEl = item.querySelector(
                ".a-size-base.s-underline-text"
              );
              if (contadorEl) {
                const texto = contadorEl.textContent
                  ?.replace(/\./g, "")
                  .replace(",", "")
                  .trim();
                numAvaliacoes = texto ? parseInt(texto) : null;
                if (isNaN(numAvaliacoes!)) numAvaliacoes = null;
              }

              // Imagem
              const imagemUrl =
                item.querySelector("img.s-image")?.getAttribute("src") || "";

              // Link do produto
              let urlProduto = "";
              const linkEl =
                item.querySelector("a.a-link-normal.s-no-outline") ||
                item.querySelector("h2 a");
              if (linkEl) {
                const href = linkEl.getAttribute("href") || "";
                const base = href.startsWith("/")
                  ? `https://www.amazon.com.br${href}`
                  : href;
                // Limpa o link para remover tracking
                if (base.includes("/dp/")) {
                  const asinPart = base.split("/dp/")[1].split(/[/?]/)[0];
                  urlProduto = `https://www.amazon.com.br/dp/${asinPart}`;
                } else {
                  urlProduto = base;
                }
              }

              if (!urlProduto) return;

              // Frete grátis
              const textoFrete =
                item
                  .querySelector(".a-color-success")
                  ?.textContent?.toLowerCase() || "";
              const freteGratis =
                textoFrete.includes("grátis") || textoFrete.includes("gratis");

              // Prime
              const isPrime = !!item.querySelector(".a-icon-prime");

              resultados.push({
                asin,
                titulo,
                preco,
                precoOriginal,
                descontoPercentual,
                avaliacao,
                numAvaliacoes,
                freteGratis,
                isPrime,
                imagemUrl,
                urlProduto,
                loja: "amazon",
              });
            } catch {
              // ignora produto com erro
            }
          });

          return resultados;
        });

        produtos.push(...produtosDaPagina);
        console.log(
          `[Amazon] ${produtosDaPagina.length} produtos na página ${pagina}`
        );

        // Pausa entre páginas
        if (pagina < numPaginas) {
          await esperar(2000, 4000);
        }
      } catch (err: any) {
        console.error(`[Amazon] Erro na página ${pagina}:`, err.message);
        continue;
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`[Amazon] Total: ${produtos.length} produtos`);
  return produtos.slice(0, 40);
}

export async function buscarMercadoLivre(
  termo: string,
  numPaginas: number = 2
): Promise<ProdutoScrapado[]> {
  console.log(`[ML] Buscando: "${termo}" em ${numPaginas} página(s)`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-sync",
      "--disable-translate",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-plugins",
      "--disable-images", // Melhor performance
    ],
  });

  const userAgent = obterUserAgentAleatorio();

  const context = await browser.newContext({
    userAgent,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: {
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
    },
  });

  // Anti-detection avançado
  await context.addInitScript(() => {
    // Remove webdriver detection
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });

    // Spoof plugins
    Object.defineProperty(navigator, "plugins", {
      get: () => [
        { name: "Chrome PDF Plugin", description: "Portable Document Format" },
        { name: "Chrome PDF Viewer", description: "" },
        { name: "Native Client Executable", description: "" },
      ],
    });

    // Spoof languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["pt-BR", "pt", "en"],
    });

    // Spoof chrome
    (window as any).chrome = {
      runtime: {},
      loadTimes: () => ({}),
      csi: () => ({}),
    };

    // Override runtime
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      navigator.constructor.prototype,
      "permissions"
    );
    if (originalDescriptor) {
      Object.defineProperty(navigator, "permissions", {
        get: () => ({
          query: () => Promise.resolve({ state: "denied" }),
        }),
      });
    }
  });

  const produtos: ProdutoScrapado[] = [];

  try {
    const page = await context.newPage();

    // Bloqueia recursos desnecessários
    await page.route(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/, (route) =>
      route.abort()
    );
    await page.route(/analytics|tracking|doubleclick|facebook|gtag/, (route) =>
      route.abort()
    );

    for (let pagina = 1; pagina <= numPaginas; pagina++) {
      try {
        await comRetry(
          async () => {
            const offset = (pagina - 1) * 48;
            const termoFormatado = termo.replace(/\s+/g, "-");
            const url =
              pagina === 1
                ? `https://lista.mercadolivre.com.br/${termoFormatado}`
                : `https://lista.mercadolivre.com.br/${termoFormatado}_Desde_${offset + 1}`;

            console.log(`[ML] Página ${pagina}/${numPaginas}...`);

            await page.goto(url, {
              waitUntil: "domcontentloaded",
              timeout: 25000,
            });

            // Aguarda resolução de challenge (se houver)
            await esperar(2000, 4000);

            // Detecta challenge by multiple methods
            const bodyContent = await page.content();
            const title = await page.title();
            const urlAtual = page.url();

            console.log(`[ML] URL: ${urlAtual}`);
            console.log(`[ML] Título: "${title}"`);
            console.log(`[ML] HTML size: ${bodyContent.length} bytes`);

            // Verifica múltiplos indicadores de challenge/bloqueio
            const possiveisChallenge =
              !title ||
              title.trim() === "" ||
              title === " " ||
              bodyContent.includes("captcha") ||
              bodyContent.includes("robot") ||
              bodyContent.includes("challenge") ||
              bodyContent.length < 1000; // HTML muito pequeno = bloqueado

            if (possiveisChallenge) {
              console.log(
                `[ML] ⚠️  Challenge/Bloqueio detectado na página ${pagina}`
              );
              console.log(
                `    Pequenas indicações: título vazio=${!title || title.trim() === ""}, captcha=${bodyContent.includes("captcha")}, robot=${bodyContent.includes("robot")}`
              );

              // Aguarda mais para resolver challenge automático
              await esperar(8000, 12000);

              // Tenta novamente após aguardar
              await page.goto(url, {
                waitUntil: "networkidle",
                timeout: 25000,
              });

              const bodyContent2 = await page.content();
              console.log(`[ML] Após retry - HTML size: ${bodyContent2.length} bytes`);
            }

            // Espera produtos aparecerem
            try {
              await page.waitForSelector(".ui-search-layout__item", {
                timeout: 15000,
              });
            } catch {
              console.log(
                `[ML] Timeout esperando produtos na página ${pagina}`
              );
              
              // Debug: tentar alternativas de selectors
              const htmlPreview = await page.content();
              console.log(
                `[ML] DEBUG - Tamanho HTML: ${htmlPreview.length} bytes`
              );
              console.log(
                `[ML] DEBUG - Contém 'search': ${htmlPreview.includes("search")}`
              );
              console.log(
                `[ML] DEBUG - Contém 'items': ${htmlPreview.includes("items")}`
              );
              console.log(
                `[ML] DEBUG - Contém 'result': ${htmlPreview.includes("result")}`
              );

              // Tenta outros seletores comuns
              const seletoresAlternativos = [
                ".ui-search-result",
                "[data-item-id]",
                ".item",
                ".product",
                "[class*='item']",
              ];

              for (const seletor of seletoresAlternativos) {
                const count = await page.$$eval(seletor, (els) => els.length).catch(() => 0);
                if (count > 0) {
                  console.log(
                    `[ML] DEBUG - Encontrou ${count} elementos com seletor: ${seletor}`
                  );
                }
              }

              throw new Error("Produtos não carregaram");
            }

            // Scroll gradual para carregar lazy-loading
            for (let i = 1; i <= 5; i++) {
              await page.evaluate(
                (fator) =>
                  window.scrollTo(0, document.body.scrollHeight * fator),
                i / 5
              );
              await esperar(300, 600);
            }

            // DEBUG: Verificar estrutura antes de tentar extract
            const htmlSnapshot = await page.content();
            const encontrouSearchLayout = htmlSnapshot.includes(
              "ui-search-layout"
            );
            const encontrouSearchItem = htmlSnapshot.includes("ui-search-item");
            const encontrouDataItemId = htmlSnapshot.includes("data-item-id");

            console.log(`[ML] DEBUG - Estrutura HTML:`);
            console.log(
              `    - "ui-search-layout" no HTML: ${encontrouSearchLayout}`
            );
            console.log(
              `    - "ui-search-item" no HTML: ${encontrouSearchItem}`
            );
            console.log(`    - "data-item-id" no HTML: ${encontrouDataItemId}`);

            const produtosDaPagina = await page.evaluate(() => {
              const items = document.querySelectorAll(
                ".ui-search-layout__item"
              );
              console.log(
                `[ML-Evaluate] Encontrados ${items.length} elementos com .ui-search-layout__item`
              );

              // DEBUG: verificar estrutura HTML
              if (items.length === 0) {
                // Tenta encontrar alternativas
                const alt1 = document.querySelectorAll(".ui-search-item");
                const alt2 = document.querySelectorAll("[data-item-id]");
                const alt3 = document.querySelectorAll(".ui-search-result");
                const alt4 = document.querySelectorAll("[class*='ui-search']");

                console.log(
                  `[ML-Evaluate] DEBUG alternativas: .ui-search-item=${alt1.length}, [data-item-id]=${alt2.length}, .ui-search-result=${alt3.length}, [class*='ui-search']=${alt4.length}`
                );

                // Mostra primeiros 5 seletores encontrados
                if (alt4.length > 0) {
                  const sample = Array.from(alt4)
                    .slice(0, 3)
                    .map((e) => e.className)
                    .join(" | ");
                  console.log(`[ML-Evaluate] Amostra de classes: ${sample}`);
                }
              }

              const resultados: any[] = [];

              items.forEach((item) => {
                try {
                  // Título
                  const titulo = item
                    .querySelector(".ui-search-item__title")
                    ?.textContent?.trim() ||
                    item
                    .querySelector(".poly-component__title")
                    ?.textContent?.trim() ||
                    item
                    .querySelector(".poly-component__title-wrapper a")
                    ?.textContent?.trim() ||
                    item.querySelector("h2")?.textContent?.trim() ||
                    item.querySelector("h3")?.textContent?.trim();

                  if (!titulo) return;

                  // Preço
                  let preco: number | null = null;
                  const precoInteiroEl = item.querySelector(
                    ".andes-money-amount__fraction"
                  );
                  const precoFracaoEl = item.querySelector(
                    ".andes-money-amount__cents"
                  );
                  if (precoInteiroEl) {
                    const inteiro = precoInteiroEl.textContent
                      ?.replace(/\./g, "")
                      .trim();
                    const centavos =
                      precoFracaoEl?.textContent?.trim() || "00";
                    preco = parseFloat(`${inteiro}.${centavos}`);
                    if (isNaN(preco)) preco = null;
                  }

                  // Preço original
                  let precoOriginal: number | null = null;
                  const precoRiscadoEl = item.querySelector(
                    ".andes-money-amount--previous .andes-money-amount__fraction"
                  );
                  if (precoRiscadoEl) {
                    const texto = precoRiscadoEl.textContent
                      ?.replace(/\./g, "")
                      .trim();
                    precoOriginal = texto ? parseFloat(texto) : null;
                    if (isNaN(precoOriginal!)) precoOriginal = null;
                  }

                  // Desconto
                  let descontoPercentual: number | null = null;
                  const descontoEl = item.querySelector(
                    ".ui-search-price__discount, .andes-money-amount__discount, .poly-component__discount"
                  );
                  if (descontoEl) {
                    const texto = descontoEl.textContent?.replace(/[^0-9]/g, "");
                    descontoPercentual = texto ? parseInt(texto) : null;
                  } else if (preco && precoOriginal && precoOriginal > preco) {
                    descontoPercentual = Math.round(
                      (1 - preco / precoOriginal) * 100
                    );
                  }

                  // Avaliação
                  let avaliacao: number | null = null;
                  const avaliacaoEl = item.querySelector(
                    ".ui-search-reviews__rating-number, .poly-reviews__rating, [class*='reviews__rating']"
                  );
                  if (avaliacaoEl) {
                    avaliacao = parseFloat(
                      avaliacaoEl.textContent?.replace(",", ".") || ""
                    );
                    if (isNaN(avaliacao)) avaliacao = null;
                  }

                  // Número de avaliações
                  let numAvaliacoes: number | null = null;
                  const numAvalEl = item.querySelector(
                    ".ui-search-reviews__amount, .poly-reviews__total, [class*='reviews__amount']"
                  );
                  if (numAvalEl) {
                    const texto = numAvalEl.textContent
                      ?.replace(/[^0-9]/g, "")
                      .trim();
                    numAvaliacoes = texto ? parseInt(texto) : null;
                  }

                  // Imagem
                  const imagemUrl =
                    item
                      .querySelector("img.ui-search-result-image__element")
                      ?.getAttribute("data-src") ||
                    item
                      .querySelector("img.ui-search-result-image__element")
                      ?.getAttribute("src") ||
                    item
                      .querySelector("img.poly-component__picture")
                      ?.getAttribute("src") ||
                    item.querySelector("img")?.getAttribute("src") ||
                    "";

                  // Link
                  let urlProduto =
                    item
                      .querySelector("a.ui-search-link")
                      ?.getAttribute("href") ||
                    item
                      .querySelector("a.ui-search-item__group__element")
                      ?.getAttribute("href") ||
                    item
                      .querySelector("a.poly-component__title")
                      ?.getAttribute("href") ||
                    item.querySelector("a")?.getAttribute("href") ||
                    "";
                  if (!urlProduto) return;
                  // Remove parâmetros de tracking
                  urlProduto = urlProduto.split("#")[0].split("?")[0];

                  // Frete grátis
                  const textoFrete =
                    item
                      .querySelector(".ui-search-item__shipping, .poly-component__shipping")
                      ?.textContent?.toLowerCase() ||
                    item.textContent?.toLowerCase() || "";
                  const freteGratis =
                    textoFrete.includes("grátis") ||
                    textoFrete.includes("gratis");

                  resultados.push({
                    titulo,
                    preco,
                    precoOriginal,
                    descontoPercentual,
                    avaliacao,
                    numAvaliacoes,
                    freteGratis,
                    isPrime: false,
                    imagemUrl,
                    urlProduto,
                    loja: "mercadolivre",
                  });
                } catch {
                  // Ignora item com erro
                }
              });

              return resultados;
            });

            produtos.push(...produtosDaPagina);
            console.log(
              `[ML] ✓ ${produtosDaPagina.length} produtos na página ${pagina}`
            );

            if (pagina < numPaginas) {
              await esperar(3000, 5000);
            }
          },
          3, // 3 tentativas
          2000 // Começa com 2s de delay
        );
      } catch (err: any) {
        console.error(`[ML] ✗ Erro na página ${pagina}:`, err.message);
        // Continua para próxima página mesmo se falhar
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`[ML] Total: ${produtos.length} produtos`);
  return produtos.slice(0, 40);
}
