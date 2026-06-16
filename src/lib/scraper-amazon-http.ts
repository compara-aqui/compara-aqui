import axios from "axios";
import * as cheerio from "cheerio";
import type { ProdutoScrapado } from "./scraper";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

function obterUserAgentAleatorio(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function parsePreco(texto: string): number | null {
  const match = texto.match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{2}))?/);
  if (!match) return null;

  const inteiro = match[1].replace(/\./g, "");
  const centavos = match[2] ?? "00";
  const preco = Number.parseFloat(`${inteiro}.${centavos}`);

  return Number.isFinite(preco) && preco > 0 ? preco : null;
}

function parseAvaliacao(texto: string): number | null {
  const match = texto.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const avaliacao = Number.parseFloat(match[1]);
  return Number.isFinite(avaliacao) ? avaliacao : null;
}

function parseQuantidade(texto: string): number | null {
  const numeros = texto.replace(/\D/g, "");
  if (!numeros) return null;

  const quantidade = Number.parseInt(numeros, 10);
  return Number.isFinite(quantidade) ? quantidade : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function buscarAmazonHttp(
  termo: string,
  numPaginas: number = 1
): Promise<ProdutoScrapado[]> {
  console.log(`[Amazon-HTTP] Buscando: "${termo}" em ${numPaginas} pagina(s)`);

  const produtos: ProdutoScrapado[] = [];
  const cliente = axios.create({
    baseURL: "https://www.amazon.com.br",
    timeout: 12000,
    maxRedirects: 4,
    headers: {
      "User-Agent": obterUserAgentAleatorio(),
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Upgrade-Insecure-Requests": "1",
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  for (let pagina = 1; pagina <= numPaginas; pagina++) {
    try {
      const response = await cliente.get("/s", {
        params: {
          k: termo,
          page: pagina,
          language: "pt_BR",
        },
        headers: {
          Referer: "https://www.amazon.com.br/",
        },
      });

      const html = String(response.data ?? "");
      const $ = cheerio.load(html);
      const itens = $('[data-component-type="s-search-result"]');

      if (itens.length === 0) {
        const htmlLower = html.toLowerCase();
        if (htmlLower.includes("captcha") || htmlLower.includes("robot check")) {
          console.warn("[Amazon-HTTP] Amazon retornou bloqueio/CAPTCHA");
        } else {
          console.warn(
            `[Amazon-HTTP] Nenhum item encontrado no HTML (${html.length} bytes)`
          );
        }
        continue;
      }

      itens.each((_index, element) => {
        const item = $(element);
        const titulo = item.find("h2 span").first().text().trim();
        const precoTexto =
          item.find(".a-price .a-offscreen").first().text().trim() ||
          item.find(".a-price-whole").first().text().trim();
        const preco = parsePreco(precoTexto);

        if (!titulo || titulo.length < 3 || !preco) return;

        const precoOriginalTexto = item
          .find(".a-price.a-text-price .a-offscreen")
          .first()
          .text()
          .trim();
        const precoOriginal = precoOriginalTexto
          ? parsePreco(precoOriginalTexto)
          : null;
        const descontoPercentual =
          precoOriginal && precoOriginal > preco
            ? Math.round((1 - preco / precoOriginal) * 100)
            : null;
        const avaliacao = parseAvaliacao(
          item.find(".a-icon-alt").first().text().trim()
        );
        const numAvaliacoes = parseQuantidade(
          item.find("a[href*='#customerReviews'] span").first().text().trim() ||
            item.find(".a-size-base.s-underline-text").first().text().trim()
        );
        const imagemUrl =
          item.find("img.s-image").first().attr("src") ||
          item.find("img").first().attr("src") ||
          "";
        const href =
          item.find("a.a-link-normal.s-no-outline").first().attr("href") ||
          item.find("h2 a").first().attr("href") ||
          "";

        if (!href) return;

        const urlProduto = href.startsWith("http")
          ? href
          : `https://www.amazon.com.br${href}`;
        const textoItem = item.text().toLowerCase();

        produtos.push({
          asin: item.attr("data-asin") || undefined,
          titulo: titulo.substring(0, 300),
          preco,
          precoOriginal,
          descontoPercentual,
          avaliacao,
          numAvaliacoes,
          freteGratis:
            textoItem.includes("frete gratis") ||
            textoItem.includes("gratis"),
          isPrime: textoItem.includes("prime"),
          imagemUrl,
          urlProduto: urlProduto.split("?")[0],
          loja: "amazon",
        });
      });

      console.log(`[Amazon-HTTP] Pagina ${pagina}: ${produtos.length} acumulados`);
    } catch (err: unknown) {
      console.error(
        `[Amazon-HTTP] Erro na pagina ${pagina}:`,
        getErrorMessage(err)
      );
    }
  }

  return produtos.slice(0, 40);
}
