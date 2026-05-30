import { buscarAmazon, buscarMercadoLivre, ProdutoScrapado } from "./scraper";
import { buscarMercadoLivreHttp } from "./scraper-ml-http";

// Busca produtos do Mercado Livre via Playwright (com fallback HTTP)
export async function buscarProdutosML(
  termo: string
): Promise<ProdutoScrapado[]> {
  // Tenta HTTP primeiro por ser muito mais rápido
  try {
    console.log("[ML-Service] Tentando buscar via HTTP...");
    const produtos = await buscarMercadoLivreHttp(termo, 1);
    if (produtos && produtos.length > 0) {
      console.log(`[ML-Service] ✓ Busca via HTTP bem-sucedida (${produtos.length} produtos)`);
      return produtos;
    }
    console.log("[ML-Service] HTTP retornou 0 produtos, tentando fallback Playwright...");
  } catch (err: any) {
    console.warn("[ML-Service] Falha no scraper HTTP:", err.message);
    console.log("[ML-Service] Tentando fallback Playwright...");
  }

  // Fallback para Playwright (mais lento, porém burla bloqueios avançados)
  try {
    return await buscarMercadoLivre(termo, 1);
  } catch (err: any) {
    console.error("[ML-Service] Falha no fallback Playwright:", err.message);
    return [];
  }
}

// Busca produtos da Amazon via Playwright
export async function buscarProdutosAmazon(
  termo: string
): Promise<ProdutoScrapado[]> {
  return await buscarAmazon(termo, 1);
}

export async function detalhesProdutoML(
  mlId: string
): Promise<any | null> {
  return null;
}

export type { ProdutoScrapado };
