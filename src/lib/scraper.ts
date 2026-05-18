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

// Pausa aleatória para simular comportamento humano
function esperar(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.random() * (maxMs - minMs) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1366, height: 768 },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const produtos: ProdutoScrapado[] = [];

  try {
    const page = await context.newPage();

    await page.route(
      /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/,
      (route) => route.abort()
    );

    for (let pagina = 1; pagina <= numPaginas; pagina++) {
      try {
        const offset = (pagina - 1) * 48;
        const termoFormatado = termo.replace(/\s+/g, "-");
        const url =
          pagina === 1
            ? `https://lista.mercadolivre.com.br/${termoFormatado}`
            : `https://lista.mercadolivre.com.br/${termoFormatado}_Desde_${offset + 1}`;

        console.log(`[ML] Página ${pagina}/${numPaginas}...`);

        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        // Espera o challenge do ML resolver (se aparecer)
        await esperar(3000, 5000);

        // Verifica se caiu no challenge
        const titulo = await page.title();
        if (!titulo || titulo.trim() === "" || titulo === " ") {
          console.log(`[ML] Challenge detectado na página ${pagina} - aguardando...`);
          await esperar(5000, 8000);
        }

        try {
          await page.waitForSelector(".ui-search-layout__item", {
            timeout: 15000,
          });
        } catch {
          console.log(`[ML] Timeout na página ${pagina} - pulando`);
          continue;
        }

        // Scroll gradual
        for (let i = 1; i <= 3; i++) {
          await page.evaluate(
            (fator) => window.scrollTo(0, document.body.scrollHeight * fator),
            i / 3
          );
          await esperar(400, 800);
        }

        const produtosDaPagina = await page.evaluate(() => {
          const items = document.querySelectorAll(".ui-search-layout__item");
          const resultados: any[] = [];

          items.forEach((item) => {
            try {
              // Título
              const titulo = item
                .querySelector(".ui-search-item__title")
                ?.textContent?.trim();
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
                const centavos = precoFracaoEl?.textContent?.trim() || "00";
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
                ".ui-search-price__discount"
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
                ".ui-search-reviews__rating-number"
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
                ".ui-search-reviews__amount"
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
                  .querySelector(
                    "img.ui-search-result-image__element"
                  )
                  ?.getAttribute("data-src") ||
                item
                  .querySelector("img.ui-search-result-image__element")
                  ?.getAttribute("src") ||
                item.querySelector("img")?.getAttribute("src") ||
                "";

              // Link
              let urlProduto =
                item
                  .querySelector("a.ui-search-link")
                  ?.getAttribute("href") || "";
              if (!urlProduto) return;
              // Remove parâmetros de tracking
              urlProduto = urlProduto.split("#")[0].split("?")[0];

              // Frete grátis
              const textoFrete =
                item
                  .querySelector(".ui-search-item__shipping")
                  ?.textContent?.toLowerCase() || "";
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
              // ignora item com erro
            }
          });

          return resultados;
        });

        produtos.push(...produtosDaPagina);
        console.log(
          `[ML] ${produtosDaPagina.length} produtos na página ${pagina}`
        );

        if (pagina < numPaginas) {
          await esperar(2000, 4000);
        }
      } catch (err: any) {
        console.error(`[ML] Erro na página ${pagina}:`, err.message);
        continue;
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`[ML] Total: ${produtos.length} produtos`);
  return produtos.slice(0, 40);
}
