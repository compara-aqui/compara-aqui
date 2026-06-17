import axios from "axios";
import type { ProdutoScrapado } from "./scraper";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

function obterUserAgentAleatorio(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface KabumProduto {
  code: number;
  name: string;
  friendlyName: string;
  image: string;
  price: number;
  priceWithDiscount: number;
  discountPercentage: number;
  rating: number;
  ratingCount: number;
  available: boolean;
  flags?: {
    isFreeShipping?: boolean;
    isFreeShippingPrime?: boolean;
    isPrime?: boolean;
  };
}

// Extrai o JSON embutido pelo Next.js (__NEXT_DATA__) no HTML da página de busca
function extrairProdutosDoHtml(html: string): KabumProduto[] {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) return [];

  const json = JSON.parse(match[1]);
  const dados = json?.props?.pageProps?.data?.catalogServer?.data;
  return Array.isArray(dados) ? dados : [];
}

export async function buscarKabumHttp(
  termo: string,
  numPaginas: number = 1
): Promise<ProdutoScrapado[]> {
  console.log(`[Kabum-HTTP] Buscando: "${termo}" em ${numPaginas} pagina(s)`);

  const produtos: ProdutoScrapado[] = [];
  const cliente = axios.create({
    baseURL: "https://www.kabum.com.br",
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
      const response = await cliente.get(`/busca/${encodeURIComponent(termo)}`, {
        params: {
          page_number: pagina,
          page_size: 40,
          sort: "most_searched",
          variant: "retail",
        },
        headers: {
          Referer: "https://www.kabum.com.br/",
        },
      });

      const html = String(response.data ?? "");
      const itens = extrairProdutosDoHtml(html);

      if (itens.length === 0) {
        console.warn(
          `[Kabum-HTTP] Nenhum item encontrado no HTML (${html.length} bytes)`
        );
        continue;
      }

      for (const item of itens) {
        const titulo = (item.name || "").trim();
        const preco =
          item.priceWithDiscount > 0 ? item.priceWithDiscount : item.price;

        if (!titulo || titulo.length < 3 || !preco || !item.available) continue;
        if (!item.code || !item.friendlyName) continue;

        const precoOriginal =
          item.price && item.price > preco ? item.price : null;
        const descontoPercentual =
          item.discountPercentage > 0
            ? Math.round(item.discountPercentage)
            : precoOriginal
              ? Math.round((1 - preco / precoOriginal) * 100)
              : null;

        produtos.push({
          titulo: titulo.substring(0, 300),
          preco,
          precoOriginal,
          descontoPercentual,
          avaliacao: item.rating > 0 ? item.rating : null,
          numAvaliacoes: item.ratingCount > 0 ? item.ratingCount : null,
          freteGratis: Boolean(
            item.flags?.isFreeShipping || item.flags?.isFreeShippingPrime
          ),
          isPrime: Boolean(item.flags?.isPrime),
          imagemUrl: item.image || "",
          urlProduto: `https://www.kabum.com.br/produto/${item.code}/${item.friendlyName}`,
          loja: "kabum",
        });
      }

      console.log(`[Kabum-HTTP] Pagina ${pagina}: ${produtos.length} acumulados`);
    } catch (err: unknown) {
      console.error(`[Kabum-HTTP] Erro na pagina ${pagina}:`, getErrorMessage(err));
    }
  }

  return produtos.slice(0, 40);
}
