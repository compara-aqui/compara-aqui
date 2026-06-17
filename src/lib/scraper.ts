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
  loja: "amazon" | "kabum" | "americanas";
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
