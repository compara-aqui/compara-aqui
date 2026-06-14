/**
 * Camada de cache para resultados de buscas
 * TTL: 2 horas por padrão
 */

import { prisma } from "./prisma";
import { ProdutoScrapado } from "./scraper";

export interface CacheBusca {
  termo: string;
  produtos: ProdutoScrapado[];
  criadoEm: Date;
  expiresAt: Date;
}

// Cache em memória (para dev/testing, em produção usar Redis)
const memoriaCache = new Map<string, CacheBusca>();

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

/**
 * Gera chave de cache normalizada
 */
function gerarChaveCache(termo: string): string {
  return `busca:${termo.toLowerCase().trim()}`;
}

/**
 * Busca cache em memória
 */
export function buscarCacheMemoria(termo: string): ProdutoScrapado[] | null {
  const chave = gerarChaveCache(termo);
  const cache = memoriaCache.get(chave);

  if (!cache) return null;

  // Verifica se expirou
  if (Date.now() > cache.expiresAt.getTime()) {
    memoriaCache.delete(chave);
    return null;
  }

  console.log(`[Cache] HIT em memória para: "${termo}"`);
  return cache.produtos;
}

/**
 * Armazena resultado em cache de memória
 */
export function armazenarCacheMemoria(
  termo: string,
  produtos: ProdutoScrapado[]
): void {
  const chave = gerarChaveCache(termo);
  const agora = new Date();
  const expiresAt = new Date(agora.getTime() + CACHE_TTL_MS);

  memoriaCache.set(chave, {
    termo: termo.toLowerCase().trim(),
    produtos,
    criadoEm: agora,
    expiresAt,
  });

  console.log(
    `[Cache] Armazenado: "${termo}" (${produtos.length} produtos, expira em 2h)`
  );
}

/**
 * Salva produtos no banco de dados para histórico de preços
 */
export async function salvarProdutosNoBD(
  termo: string,
  produtos: ProdutoScrapado[]
): Promise<void> {
  if (!produtos.length) return;

  try {
    // Para cada produto, salva/atualiza no banco
    for (const prod of produtos) {
      // Cria ou atualiza o Produto com constraint único (titulo + loja)
      const produtoDb = await prisma.produto.upsert({
        where: {
          titulo_loja: {
            titulo: prod.titulo,
            loja: prod.loja,
          },
        },
        update: {
          atualizadoEm: new Date(),
        },
        create: {
          titulo: prod.titulo,
          loja: prod.loja,
          imagem: prod.imagemUrl || undefined,
          categoria: termo || undefined,
          marca: undefined, // Poderia extrair da descrição
        },
      });

      // Salva o preço atual
      await prisma.precoProduto.create({
        data: {
          produtoId: produtoDb.id,
          loja: prod.loja,
          preco: prod.preco || 0,
          precoOriginal: prod.precoOriginal || undefined,
          frete: 0, // Simplificado, poderia extrair de prod.freteGratis
          urlProduto: prod.urlProduto,
          disponivel: (prod.preco ?? 0) > 0,
        },
      });

      // Salva no histórico para análise de tendências
      await prisma.historicoPreco.create({
        data: {
          produtoId: produtoDb.id,
          loja: prod.loja,
          preco: prod.preco || 0,
        },
      });
    }

    console.log(
      `[DB] Salvos ${produtos.length} produtos de "${termo}" no banco de dados`
    );
  } catch (error) {
    // Em desenvolvimento, loga mas não quebra a aplicação
    console.error("[DB] Erro ao salvar produtos:", error);
  }
}

/**
 * Limpa cache expirado (pode ser executado em background)
 */
export function limparCacheExpirado(): number {
  let removidos = 0;

  for (const [chave, cache] of memoriaCache.entries()) {
    if (Date.now() > cache.expiresAt.getTime()) {
      memoriaCache.delete(chave);
      removidos++;
    }
  }

  if (removidos > 0) {
    console.log(`[Cache] Limpeza: ${removidos} entradas expiradas removidas`);
  }

  return removidos;
}

/**
 * Limpa cache específico (útil para forçar refresh)
 */
export function limparCacheEspecifico(termo: string): void {
  const chave = gerarChaveCache(termo);
  memoriaCache.delete(chave);
  console.log(`[Cache] Limpeza forçada: "${termo}"`);
}

/**
 * Status do cache
 */
export function statusCache(): { entradas: number; tamanho: string } {
  const entradas = memoriaCache.size;
  const tamanho = `~${(entradas * 50 * 1024).toLocaleString()} bytes`; // Estimativa

  return { entradas, tamanho };
}

/**
 * Busca produtos históricos do banco (fallback quando scraper falha)
 * Procura por qualquer entrada de até 24h atrás
 */
export async function buscarCacheFallback24h(
  termo: string,
  loja?: "amazon" | "mercadolivre"
): Promise<ProdutoScrapado[] | null> {
  try {
    const hora24AtrasMilisegundos = 24 * 60 * 60 * 1000;
    const dataMinima = new Date(Date.now() - hora24AtrasMilisegundos);

    // Busca produtos pela loja que tenham histórico recente
    // Nota: SQLite não suporta mode: "insensitive", usamos contains simples
    const produtos = await prisma.produto.findMany({
      where: {
        titulo: {
          contains: termo,
        },
        ...(loja && { loja }),
        precos: {
          some: {
            atualizadoEm: {
              gte: dataMinima,
            },
          },
        },
      },
      include: {
        precos: {
          orderBy: { atualizadoEm: "desc" as const },
          take: 1,
        },
      },
      take: 40,
    });

    if (produtos.length === 0) return null;

    // Converte para formato ProdutoScrapado
    const produtosScrapados: ProdutoScrapado[] = produtos.map((p) => ({
      titulo: p.titulo,
      preco: p.precos[0]?.preco ?? null,
      precoOriginal: p.precos[0]?.precoOriginal ?? null,
      descontoPercentual: null,
      avaliacao: null,
      numAvaliacoes: null,
      freteGratis: Boolean(p.precos[0]?.frete === 0),
      isPrime: false,
      imagemUrl: p.imagem ?? "",
      urlProduto: p.precos[0]?.urlProduto ?? "",
      loja: p.loja as "amazon" | "mercadolivre",
    }));

    console.log(
      `[Cache-Fallback] Encontrados ${produtosScrapados.length} produtos históricos para "${termo}"`
    );

    return produtosScrapados;
  } catch (error) {
    console.log("[Cache-Fallback] Erro ao buscar histórico:", error);
    return null;
  }
}
