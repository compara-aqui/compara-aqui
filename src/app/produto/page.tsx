"use client";
import { useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ShoppingCart, Trophy } from "lucide-react";
import type { ProdutoAgrupado } from "@/lib/agrupar-produtos";

const LOJA_LABELS: Record<string, string> = {
  amazon: "Amazon",
  kabum: "Kabum",
  americanas: "Americanas",
};
const LOJA_CORES: Record<string, string> = {
  amazon: "bg-orange-100 text-orange-800",
  kabum: "bg-blue-100 text-blue-800",
  americanas: "bg-red-100 text-red-800",
};

function formatarPreco(preco: number): string {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProdutoConteudo() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const produto = useMemo<ProdutoAgrupado | null>(() => {
    const dados = searchParams.get("d");
    if (!dados) return null;
    try {
      return JSON.parse(decodeURIComponent(dados));
    } catch {
      return null;
    }
  }, [searchParams]);

  if (!produto) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 font-medium">
          Nao foi possivel carregar esse produto.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-orange-500 text-sm font-semibold hover:underline"
        >
          Voltar para a busca
        </button>
      </div>
    );
  }

  const menorPreco = produto.ofertas[0].preco;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para os resultados
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-72 shrink-0 relative aspect-square bg-gray-50">
            {produto.imagemUrl ? (
              <Image
                src={produto.imagemUrl}
                alt={produto.titulo}
                fill
                className="object-contain p-6"
                sizes="288px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                Sem imagem
              </div>
            )}
          </div>

          <div className="flex-1 p-6 flex flex-col gap-4">
            <h1 className="text-lg font-bold text-gray-900 leading-snug">
              {produto.titulo}
            </h1>

            <div className="flex flex-col gap-3">
              {produto.ofertas.map((oferta, index) => {
                const ehMaisBarato = index === 0;
                const lojaLabel = LOJA_LABELS[oferta.loja] ?? oferta.loja;
                const lojaColor = LOJA_CORES[oferta.loja] ?? "bg-gray-100 text-gray-800";

                return (
                  <div
                    key={`${oferta.loja}-${index}`}
                    className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${
                      ehMaisBarato
                        ? "border-green-200 bg-green-50"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${lojaColor}`}
                      >
                        {lojaLabel}
                      </span>
                      {ehMaisBarato && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                          <Trophy className="w-3.5 h-3.5" />
                          Mais barato
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {oferta.precoOriginal != null && oferta.precoOriginal > oferta.preco && (
                          <p className="text-xs text-gray-400 line-through">
                            {formatarPreco(oferta.precoOriginal)}
                          </p>
                        )}
                        <p
                          className={`text-lg font-bold ${
                            ehMaisBarato ? "text-green-700" : "text-gray-900"
                          }`}
                        >
                          {formatarPreco(oferta.preco)}
                        </p>
                        {oferta.freteGratis && (
                          <p className="text-xs text-green-600 font-medium">Frete gratis</p>
                        )}
                      </div>

                      <a
                        href={oferta.urlProduto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-colors whitespace-nowrap"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Comprar
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-400">
              Melhor preco encontrado: {formatarPreco(menorPreco)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProdutoPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-20" />}>
      <ProdutoConteudo />
    </Suspense>
  );
}
