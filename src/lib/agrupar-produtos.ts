import type { ResultadoBusca } from "@/types";

export interface OfertaLoja {
  loja: ResultadoBusca["loja"];
  preco: number;
  precoOriginal: number | null;
  descontoPercentual: number | null;
  avaliacao: number | null;
  numAvaliacoes: number | null;
  freteGratis: boolean;
  isPrime: boolean;
  urlProduto: string;
}

export interface ProdutoAgrupado {
  id: string;
  titulo: string;
  imagemUrl: string;
  ofertas: OfertaLoja[]; // ordenadas por preco crescente
}

// Palavras sem valor para diferenciar produtos (marketing, conectivos, condicao padrao)
const PALAVRAS_IGNORADAS = new Set([
  "smartphone", "celular", "tablet", "notebook", "computador", "original",
  "lacrado", "garantia", "anatel", "novo", "com", "de", "da", "do", "para",
  "em", "e", "a", "o", "compre", "ja", "un", "unidade", "kit", "promocao",
  "oferta", "frete", "gratis",
]);

// Variantes de modelo que NUNCA podem ser misturadas (produtos diferentes,
// mesmo compartilhando a maioria das outras palavras do titulo)
const VARIANTES = [
  "pro max", "pro", "plus", "max", "mini", "ultra", "lite", "se", "air",
  "note", "gamer", "fe",
];

const CORES = [
  "preto", "branco", "azul", "verde", "vermelho", "rosa", "dourado", "prata",
  "cinza", "roxo", "amarelo", "laranja", "grafite", "titanio", "bege",
  "marrom", "lilas",
];

// Palavras que indicam um TIPO de produto diferente do item principal
// (ex.: controle e console nunca podem cair no mesmo grupo, mesmo que o
// titulo compartilhe "playstation 5" com a maioria das outras palavras)
const TIPOS_ACESSORIO = [
  "controle", "case", "capa", "pelicula", "fone", "headset", "carregador",
  "cabo", "suporte", "bolsa", "mochila", "adaptador", "fonte", "bateria",
  "vidro", "skin", "base", "dock", "cooler", "volante", "joystick",
  "voucher", "cartao", "assinatura", "jogo", "game", "controller",
];

const LIMIAR_SIMILARIDADE = 0.45;
// Acima dessa razao em relacao ao menor preco do grupo, a oferta e tratada
// como possivel categoria diferente (ex.: acessorio vs produto principal)
// e isolada, mesmo que o titulo tenha passado pelos outros filtros.
const RAZAO_MAXIMA_PRECO = 2.2;

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // remove acentos
    .replace(/[^a-z0-9\s]/g, " ") // remove pontuacao
    .replace(/(\d+)(gb|tb|mb)\b/g, "$1 $2") // "128gb" -> "128 gb" p/ tokenizar igual em qualquer formatacao
    .replace(/\s+/g, " ")
    .trim();
}

function extrairCapacidade(textoNormalizado: string): string | null {
  const match = textoNormalizado.match(/\b(\d+)\s(gb|tb|mb)\b/);
  return match ? `${match[1]}${match[2]}` : null;
}

function extrairVariante(textoNormalizado: string): string | null {
  for (const variante of VARIANTES) {
    if (new RegExp(`\\b${variante}\\b`).test(textoNormalizado)) return variante;
  }
  return null;
}

function extrairCor(tokens: Set<string>): string | null {
  for (const cor of CORES) {
    if (tokens.has(cor)) return cor;
  }
  return null;
}

function extrairTipoAcessorio(tokens: Set<string>): string | null {
  for (const tipo of TIPOS_ACESSORIO) {
    if (tokens.has(tipo)) return tipo;
  }
  return null;
}

// Numeros curtos (modelo: "15", "16e", "rtx4050" nao entra, mas "s24" sim)
// sao o sinal mais forte de que dois produtos sao versoes diferentes
// (iPhone 15 vs iPhone 16e), mesmo quando o resto do titulo e quase
// identico. Tratamos como campo obrigatorio assim como variante/cor.
function extrairNumerosModelo(tokens: Set<string>): Set<string> {
  const numeros = new Set<string>();
  for (const token of tokens) {
    if (/^\d{1,2}[a-z]?$/.test(token)) numeros.add(token);
  }
  return numeros;
}

function numerosCompativeis(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return true;
  for (const numero of a) if (b.has(numero)) return true;
  return false;
}

function extrairTokensSignificativos(textoNormalizado: string): Set<string> {
  return new Set(
    textoNormalizado
      .split(" ")
      .filter((token) => token.length >= 2 && !PALAVRAS_IGNORADAS.has(token))
  );
}

function similaridadeJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersecao = 0;
  for (const token of a) if (b.has(token)) intersecao++;
  const uniao = a.size + b.size - intersecao;
  return uniao === 0 ? 0 : intersecao / uniao;
}

interface GrupoInterno {
  tokens: Set<string>;
  numeros: Set<string>;
  capacidade: string | null;
  cor: string | null;
  variante: string | null;
  tipoAcessorio: string | null;
  produtos: ResultadoBusca[];
}

/**
 * Agrupa produtos de lojas diferentes que representam o mesmo item.
 * Como nao ha SKU/EAN em comum entre Amazon, Kabum e Americanas, a
 * comparacao e feita por similaridade de titulo (marca + modelo) somada a
 * checagem exata de capacidade de armazenamento, cor e variante (Pro/Plus/etc).
 */
export function agruparProdutos(produtos: ResultadoBusca[]): ProdutoAgrupado[] {
  const grupos: GrupoInterno[] = [];

  for (const produto of produtos) {
    const normalizado = normalizarTexto(produto.titulo);
    const tokens = extrairTokensSignificativos(normalizado);
    const numeros = extrairNumerosModelo(tokens);
    const capacidade = extrairCapacidade(normalizado);
    const cor = extrairCor(tokens);
    const variante = extrairVariante(normalizado);
    const tipoAcessorio = extrairTipoAcessorio(tokens);

    let grupoEncontrado: GrupoInterno | null = null;

    for (const grupo of grupos) {
      if (capacidade && grupo.capacidade && capacidade !== grupo.capacidade) continue;
      if (cor && grupo.cor && cor !== grupo.cor) continue;
      // variante e tipo de acessorio sao estritos: presenca divergente
      // (inclusive ausente vs presente) bloqueia o match
      if ((variante || grupo.variante) && variante !== grupo.variante) continue;
      if ((tipoAcessorio || grupo.tipoAcessorio) && tipoAcessorio !== grupo.tipoAcessorio) continue;
      // numero do modelo (15 vs 16e) tambem e estrito: sem nenhuma
      // intersecao, sao versoes diferentes mesmo com o resto do titulo igual
      if (!numerosCompativeis(numeros, grupo.numeros)) continue;

      if (similaridadeJaccard(tokens, grupo.tokens) >= LIMIAR_SIMILARIDADE) {
        grupoEncontrado = grupo;
        break;
      }
    }

    if (grupoEncontrado) {
      grupoEncontrado.produtos.push(produto);
      for (const token of tokens) grupoEncontrado.tokens.add(token);
      for (const numero of numeros) grupoEncontrado.numeros.add(numero);
      if (!grupoEncontrado.capacidade && capacidade) grupoEncontrado.capacidade = capacidade;
      if (!grupoEncontrado.cor && cor) grupoEncontrado.cor = cor;
      if (!grupoEncontrado.variante && variante) grupoEncontrado.variante = variante;
      if (!grupoEncontrado.tipoAcessorio && tipoAcessorio) grupoEncontrado.tipoAcessorio = tipoAcessorio;
    } else {
      grupos.push({ tokens, numeros, capacidade, cor, variante, tipoAcessorio, produtos: [produto] });
    }
  }

  // Rede de seguranca: mesmo passando pelos filtros de titulo, um preco
  // muito fora da faixa do grupo costuma indicar categoria errada
  // (ex.: voucher/acessorio sem palavra-chave conhecida). Isola esses casos.
  const gruposRefinados: GrupoInterno[] = [];
  for (const grupo of grupos) {
    if (grupo.produtos.length <= 1) {
      gruposRefinados.push(grupo);
      continue;
    }

    const precoMinimo = Math.min(...grupo.produtos.map((p) => p.preco));
    const dentroDaFaixa = grupo.produtos.filter(
      (p) => p.preco <= precoMinimo * RAZAO_MAXIMA_PRECO
    );
    const foraDaFaixa = grupo.produtos.filter(
      (p) => p.preco > precoMinimo * RAZAO_MAXIMA_PRECO
    );

    gruposRefinados.push({ ...grupo, produtos: dentroDaFaixa });
    for (const produtoIsolado of foraDaFaixa) {
      gruposRefinados.push({
        tokens: new Set(),
        numeros: new Set(),
        capacidade: null,
        cor: null,
        variante: null,
        tipoAcessorio: null,
        produtos: [produtoIsolado],
      });
    }
  }

  return gruposRefinados.map((grupo, index) => {
    const ofertas: OfertaLoja[] = [...grupo.produtos]
      .sort((a, b) => a.preco - b.preco)
      .map((p) => ({
        loja: p.loja,
        preco: p.preco,
        precoOriginal: p.precoOriginal ?? null,
        descontoPercentual: p.descontoPercentual ?? null,
        avaliacao: p.avaliacao ?? null,
        numAvaliacoes: p.numAvaliacoes ?? null,
        freteGratis: Boolean(p.freteGratis),
        isPrime: Boolean(p.isPrime),
        urlProduto: p.urlProduto,
      }));

    // titulo mais curto tende a ser o mais limpo (menos sufixo de SKU/marketing)
    const tituloRepresentativo = [...grupo.produtos].sort(
      (a, b) => a.titulo.length - b.titulo.length
    )[0].titulo;

    const imagemRepresentativa =
      grupo.produtos.find((p) => p.loja === ofertas[0].loja)?.imagemUrl ||
      grupo.produtos[0].imagemUrl ||
      "";

    return {
      id: `g${index}`,
      titulo: tituloRepresentativo,
      imagemUrl: imagemRepresentativa,
      ofertas,
    };
  });
}
