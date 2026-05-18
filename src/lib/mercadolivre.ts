import { buscarAmazon, ProdutoScrapado } from "./scraper";

// Por enquanto busca só na Amazon
// ML será adicionado quando tivermos o scraper do ML pronto
export async function buscarProdutosML(termo: string): Promise<ProdutoScrapado[]> {
  // ML desativado temporariamente - retorna vazio
  return [];
}

export async function buscarProdutosAmazon(termo: string): Promise<ProdutoScrapado[]> {
  return await buscarAmazon(termo, 1);
}

export async function detalhesProdutoML(mlId: string): Promise<any | null> {
  return null;
}
