"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { ResultadoBusca } from "@/types";
import { Search, Loader2 } from "lucide-react";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function BuscaConteudo() {
  const searchParams = useSearchParams();
  const termo = searchParams.get("q") || "";

  const [produtos, setProdutos] = useState<ResultadoBusca[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [ordenacao, setOrdenacao] = useState("relevancia");
  const [filtroLoja, setFiltroLoja] = useState<string>("todas");
  const [filtroFrete, setFiltroFrete] = useState<boolean>(false);

  useEffect(() => {
    if (!termo) return;

    async function buscar() {
      setLoading(true);
      setErro("");
      setProdutos([]);

      try {
        const res = await fetch(`/api/buscar?q=${encodeURIComponent(termo)}`);
        const contentType = res.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
          ? await res.json()
          : null;

        if (!res.ok) {
          throw new Error(data?.error || "Erro ao buscar produtos.");
        }

        if (!data) {
          throw new Error("A busca retornou uma resposta invalida.");
        }

        setProdutos(data.produtos || []);
      } catch (err: unknown) {
        setErro(getErrorMessage(err) || "Nao foi possivel buscar os produtos.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    buscar();
  }, [termo]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Resultados para:{" "}
              <span className="text-orange-500">{termo}</span>
            </h1>
            {!loading && produtos.length > 0 && (
              <p className="text-sm text-gray-400 mt-0.5">
                {produtos.length} produtos encontrados
              </p>
            )}
          </div>
        </div>

        {!loading && produtos.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label htmlFor="ordenacao" className="text-sm text-gray-500 font-medium">
              Ordenar por:
            </label>
            <select
              id="ordenacao"
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2"
            >
              <option value="relevancia">Relevancia</option>
              <option value="menor_preco">Menor Preco</option>
              <option value="maior_preco">Maior Preco</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 shrink-0">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm sticky top-24">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 text-sm">
                <Search className="w-4 h-4" />
              </span>
              Filtros Avancados
            </h3>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Lojas</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="loja"
                    value="todas"
                    checked={filtroLoja === "todas"}
                    onChange={() => setFiltroLoja("todas")}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors">
                    Todas as lojas
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="loja"
                    value="amazon"
                    checked={filtroLoja === "amazon"}
                    onChange={() => setFiltroLoja("amazon")}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors">
                    Amazon
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="loja"
                    value="kabum"
                    checked={filtroLoja === "kabum"}
                    onChange={() => setFiltroLoja("kabum")}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors">
                    Kabum
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="loja"
                    value="americanas"
                    checked={filtroLoja === "americanas"}
                    onChange={() => setFiltroLoja("americanas")}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors">
                    Americanas
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Beneficios</h4>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filtroFrete}
                  onChange={(e) => setFiltroFrete(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-gray-300"
                />
                <span className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors">
                  Frete Gratis
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
              <p className="text-gray-400 text-sm">Buscando os melhores precos...</p>
            </div>
          )}

          {erro && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
              <p className="text-red-500 font-medium">{erro}</p>
              <p className="text-red-400 text-sm mt-1">
                Tente novamente em alguns instantes.
              </p>
            </div>
          )}

          {!loading && !erro && produtos.length === 0 && termo && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">Nenhum produto encontrado</p>
              <p className="text-gray-400 text-sm">Tente buscar com outras palavras</p>
            </div>
          )}

          {!loading &&
            produtos.length > 0 &&
            (() => {
              const produtosFiltrados = produtos.filter((p) => {
                if (filtroLoja !== "todas" && p.loja !== filtroLoja) return false;
                if (filtroFrete && !p.freteGratis && p.frete !== 0) return false;
                return true;
              });

              const produtosOrdenados = [...produtosFiltrados].sort((a, b) => {
                const precoA = a.preco || 0;
                const precoB = b.preco || 0;
                if (ordenacao === "menor_preco") return precoA - precoB;
                if (ordenacao === "maior_preco") return precoB - precoA;
                return 0;
              });

              if (produtosOrdenados.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <p className="text-gray-500 font-medium">
                      Nenhum produto atende aos filtros
                    </p>
                    <button
                      onClick={() => {
                        setFiltroLoja("todas");
                        setFiltroFrete(false);
                      }}
                      className="text-orange-500 text-sm font-semibold hover:underline"
                    >
                      Limpar filtros
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {produtosOrdenados.map((produto, index) => (
                    <ProductCard key={`${produto.urlProduto}-${index}`} produto={produto} />
                  ))}
                </div>
              );
            })()}
        </div>
      </div>
    </div>
  );
}

export default function BuscaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          <p className="text-gray-400 text-sm">Carregando...</p>
        </div>
      }
    >
      <BuscaConteudo />
    </Suspense>
  );
}
