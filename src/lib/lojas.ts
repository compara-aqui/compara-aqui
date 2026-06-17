import type { ProdutoScrapado } from "./scraper";
import { buscarAmazonHttp } from "./scraper-amazon-http";
import { buscarKabumHttp } from "./scraper-kabum-http";
import { buscarAmericanasHttp } from "./scraper-americanas-http";

const isVercel = process.env.VERCEL === "1";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function buscarProdutosAmazon(
  termo: string
): Promise<ProdutoScrapado[]> {
  try {
    console.log("[Amazon-Service] Tentando buscar via HTTP...");
    const produtos = await buscarAmazonHttp(termo, 1);
    if (produtos.length > 0) {
      console.log(
        `[Amazon-Service] Busca via HTTP bem-sucedida (${produtos.length} produtos)`
      );
      return produtos;
    }
  } catch (err: unknown) {
    console.warn("[Amazon-Service] Falha no scraper HTTP:", getErrorMessage(err));
  }

  if (isVercel) {
    console.warn("[Amazon-Service] Ignorando fallback Playwright na Vercel");
    return [];
  }

  try {
    console.log("[Amazon-Service] Tentando fallback Playwright...");
    const { buscarAmazon } = await import("./scraper");
    return await buscarAmazon(termo, 1);
  } catch (err: unknown) {
    console.error(
      "[Amazon-Service] Falha no fallback Playwright:",
      getErrorMessage(err)
    );
    return [];
  }
}

export async function buscarProdutosKabum(
  termo: string
): Promise<ProdutoScrapado[]> {
  try {
    return await buscarKabumHttp(termo, 1);
  } catch (err: unknown) {
    console.error("[Kabum-Service] Falha no scraper HTTP:", getErrorMessage(err));
    return [];
  }
}

export async function buscarProdutosAmericanas(
  termo: string
): Promise<ProdutoScrapado[]> {
  try {
    return await buscarAmericanasHttp(termo, 1);
  } catch (err: unknown) {
    console.error(
      "[Americanas-Service] Falha no scraper HTTP:",
      getErrorMessage(err)
    );
    return [];
  }
}

export type { ProdutoScrapado };
