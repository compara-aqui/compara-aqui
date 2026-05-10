export interface ProdutoLoja {
  id: string;
  titulo: string;
  preco: number;
  precoOriginal?: number;
  imagem: string;
  urlProduto: string;
  urlAfiliado?: string;
  loja: "mercadolivre" | "amazon";
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
  mercadolivre?: number;
  amazon?: number;
}

export interface ResultadoBusca {
  titulo: string;
  imagem: string;
  preco: number;
  urlProduto: string;
  loja: "mercadolivre" | "amazon";
  frete: number;
}