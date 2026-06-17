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

interface AmericanasOffer {
  Price: number;
  ListPrice: number;
  IsAvailable: boolean;
}

interface AmericanasSeller {
  sellerDefault?: boolean;
  commertialOffer: AmericanasOffer;
}

interface AmericanasItem {
  images: { imageUrl: string }[];
  sellers: AmericanasSeller[];
}

interface AmericanasProduto {
  productName: string;
  link: string;
  productClusters?: Record<string, string>;
  items: AmericanasItem[];
}

// API pública do VTEX (catalog system) usada pela Americanas/Submarino/Shoptime
const ENDPOINT = "https://www.americanas.com.br/api/catalog_system/pub/products/search";

function temFreteGratis(produto: AmericanasProduto): boolean {
  const clusters = Object.values(produto.productClusters ?? {});
  return clusters.some((nome) => nome.toLowerCase().includes("frete-gratis"));
}

export async function buscarAmericanasHttp(
  termo: string,
  numPaginas: number = 1
): Promise<ProdutoScrapado[]> {
  console.log(`[Americanas-HTTP] Buscando: "${termo}" em ${numPaginas} pagina(s)`);

  const produtos: ProdutoScrapado[] = [];
  const cliente = axios.create({
    timeout: 12000,
    maxRedirects: 4,
    headers: {
      "User-Agent": obterUserAgentAleatorio(),
      Accept: "application/json",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const tamanhoPagina = 40;

  for (let pagina = 1; pagina <= numPaginas; pagina++) {
    try {
      const from = (pagina - 1) * tamanhoPagina;
      const to = from + tamanhoPagina - 1;

      const response = await cliente.get<AmericanasProduto[]>(
        `${ENDPOINT}/${encodeURIComponent(termo)}`,
        {
          params: {
            O: "OrderByScoreDESC",
            _from: from,
            _to: to,
          },
        }
      );

      const itens = Array.isArray(response.data) ? response.data : [];

      if (itens.length === 0) {
        console.warn(`[Americanas-HTTP] Nenhum item encontrado na pagina ${pagina}`);
        continue;
      }

      for (const item of itens) {
        const titulo = (item.productName || "").trim();
        const imagemItem = item.items?.[0];
        const seller =
          imagemItem?.sellers?.find((s) => s.sellerDefault) ??
          imagemItem?.sellers?.[0];
        const oferta = seller?.commertialOffer;

        if (!titulo || titulo.length < 3 || !oferta) continue;
        if (!oferta.IsAvailable || !oferta.Price || oferta.Price <= 0) continue;
        if (!item.link) continue;

        const preco = oferta.Price;
        const precoOriginal =
          oferta.ListPrice && oferta.ListPrice > preco ? oferta.ListPrice : null;
        const descontoPercentual = precoOriginal
          ? Math.round((1 - preco / precoOriginal) * 100)
          : null;

        produtos.push({
          titulo: titulo.substring(0, 300),
          preco,
          precoOriginal,
          descontoPercentual,
          avaliacao: null,
          numAvaliacoes: null,
          freteGratis: temFreteGratis(item),
          isPrime: false,
          imagemUrl: imagemItem?.images?.[0]?.imageUrl || "",
          urlProduto: item.link.split("?")[0],
          loja: "americanas",
        });
      }

      console.log(
        `[Americanas-HTTP] Pagina ${pagina}: ${produtos.length} acumulados`
      );
    } catch (err: unknown) {
      console.error(
        `[Americanas-HTTP] Erro na pagina ${pagina}:`,
        getErrorMessage(err)
      );
    }
  }

  return produtos.slice(0, 40);
}
