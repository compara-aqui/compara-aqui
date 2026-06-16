import type { ProdutoScrapado } from "./scraper";
import { buscarAmazonHttp } from "./scraper-amazon-http";
import { buscarMercadoLivreHttp } from "./scraper-ml-http";

const isVercel = process.env.VERCEL === "1";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function buscarProdutosML(
  termo: string
): Promise<ProdutoScrapado[]> {
  try {
    console.log("[ML-Service] Tentando buscar via HTTP...");
    const produtos = await buscarMercadoLivreHttp(termo, 1);
    if (produtos.length > 0) {
      console.log(
        `[ML-Service] Busca via HTTP bem-sucedida (${produtos.length} produtos)`
      );
      return produtos;
    }
  } catch (err: unknown) {
    console.warn("[ML-Service] Falha no scraper HTTP:", getErrorMessage(err));
  }

  if (isVercel) {
    console.warn("[ML-Service] Ignorando fallback Playwright na Vercel");
    return [];
  }

  try {
    console.log("[ML-Service] Tentando fallback Playwright...");
    const { buscarMercadoLivre } = await import("./scraper");
    return await buscarMercadoLivre(termo, 1);
  } catch (err: unknown) {
    console.error("[ML-Service] Falha no fallback Playwright:", getErrorMessage(err));
    return [];
  }
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

export async function detalhesProdutoML(mlId: string): Promise<unknown | null> {
  void mlId;
  return null;
}

export type { ProdutoScrapado };
