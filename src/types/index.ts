export interface ProdutoLoja {
  id: string;
  titulo: string;
  preco: number;
  precoOriginal?: number;
  imagem: string;
  urlProduto: string;
  urlAfiliado?: string;
  loja: "amazon" | "kabum" | "americanas";
  frete: number;
  disponivel: boolean;
}

export interface ProdutoDetalhes {
  id: string;
  titulo: string;
  imagem: string;
  categoria?: string;
  marca?: string;
  precos: ProdutoLoja[];
  historico: HistoricoItem[];
}

export interface HistoricoItem {
  data: string;
  amazon?: number;
  kabum?: number;
  americanas?: number;
}

export interface ResultadoBusca {
  titulo: string;
  imagemUrl: string;
  preco: number;
  precoOriginal?: number | null;
  descontoPercentual?: number | null;
  avaliacao?: number | null;
  numAvaliacoes?: number | null;
  urlProduto: string;
  loja: "amazon" | "kabum" | "americanas";
  frete?: number;
  freteGratis?: boolean;
  isPrime?: boolean;
}