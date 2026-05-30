import { NextRequest, NextResponse } from "next/server";
import { buscarProdutosAmazon, buscarProdutosML } from "@/lib/mercadolivre";
import {
  buscarCacheMemoria,
  armazenarCacheMemoria,
  salvarProdutosNoBD,
  buscarCacheFallback24h,
} from "@/lib/cache";

// Wrapper com timeout para promise
function comTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms)
    ),
  ]);
}

export async function GET(request: NextRequest) {
  const termo = request.nextUrl.searchParams.get("q");
  const forcarRefresh = request.nextUrl.searchParams.get("refresh") === "1";

  if (!termo || termo.trim().length < 2) {
    return NextResponse.json(
      { error: "Digite ao menos 2 caracteres" },
      { status: 400 }
    );
  }

  try {
    const termoLimpo = termo.trim();

    // 1. Verifica cache (exceto se forcar refresh)
    if (!forcarRefresh) {
      const cacheResult = buscarCacheMemoria(termoLimpo);
      if (cacheResult !== null) {
        console.log(`[API] Cache HIT - retornando ${cacheResult.length} produtos`);
        return NextResponse.json({
          produtos: cacheResult,
          total: cacheResult.length,
          fonte: "cache",
        });
      }

      // Verifica Cache do Banco de Dados (Fallback histórico 24h)
      const dbCache = await buscarCacheFallback24h(termoLimpo);
      if (dbCache && dbCache.length > 0) {
        console.log(`[API] DB Cache HIT - retornando ${dbCache.length} produtos (SWR)`);
        
        // Trigger background scrape para manter dados frescos (SWR)
        const refreshCache = async () => {
          try {
            console.log(`[SWR] Iniciando scraping em background para "${termoLimpo}"`);
            const [produtosAmazon, produtosML] = await Promise.all([
              comTimeout(buscarProdutosAmazon(termoLimpo), 25000).catch(() => []),
              comTimeout(buscarProdutosML(termoLimpo), 25000).catch(() => []),
            ]);
            const todos = [...produtosAmazon, ...produtosML].filter(p => p.preco != null && p.preco > 0);
            if (todos.length > 0) {
              armazenarCacheMemoria(termoLimpo, todos);
              await salvarProdutosNoBD(termoLimpo, todos);
              console.log(`[SWR] Cache em background finalizado para "${termoLimpo}"`);
            }
          } catch(e) {
            console.error("[SWR] Erro na atualização em background:", e);
          }
        };
        
        refreshCache(); // Não damos await para não bloquear a resposta!
        
        return NextResponse.json({
          produtos: dbCache,
          total: dbCache.length,
          fonte: "db_cache",
        });
      }
    }

    console.log(
      `[API] Buscando: "${termoLimpo}" em Amazon + Mercado Livre (${forcarRefresh ? "forçado" : "normal"})`
    );

    // 2. Busca em ambos em paralelo com timeout
    const [produtosAmazon, produtosML] = await Promise.all([
      comTimeout(buscarProdutosAmazon(termoLimpo), 25000).catch((err) => {
        console.error("[API] Erro Amazon:", err.message);
        return [];
      }),
      comTimeout(buscarProdutosML(termoLimpo), 25000).catch((err) => {
        console.error("[API] Erro Mercado Livre:", err.message);
        return [];
      }),
    ]);

    // 3. Combina resultados
    const todosOsProdutos = [...produtosAmazon, ...produtosML];

    // 4. Filtra produtos sem preço
    const produtosValidos = todosOsProdutos.filter(
      (p) => p.preco != null && p.preco > 0
    );

    console.log(
      `[API] Total: ${produtosValidos.length} produtos (${produtosAmazon.length} Amazon + ${produtosML.length} ML)`
    );

    // 5. Armazena no cache de memória (rápido, síncrono)
    if (produtosValidos.length > 0) {
      armazenarCacheMemoria(termoLimpo, produtosValidos);

      // 6. Salva no BD em background (não bloqueia resposta)
      // Fire and forget: não aguardamos a Promise
      salvarProdutosNoBD(termoLimpo, produtosValidos).catch((err) => {
        console.error("[API] Erro ao salvar no BD:", err);
      });
    }

    return NextResponse.json({
      produtos: produtosValidos,
      total: produtosValidos.length,
      fonte: "scraper",
    });
  } catch (error: any) {
    console.error("[API] Erro na rota de busca:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Erro ao buscar produtos." },
      { status: 500 }
    );
  }
}
