"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { ResultadoBusca } from "@/types";
import { Search, Loader2 } from "lucide-react";

export default function BuscaPage() {
  const searchParams = useSearchParams();
  const termo = searchParams.get("q") || "";

  const [produtos, setProdutos] = useState<ResultadoBusca[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!termo) return;

    async function buscar() {
      setLoading(true);
      setErro("");
      setProdutos([]);

      try {
        const res = await fetch(
          `/api/buscar?q=${encodeURIComponent(termo)}`
        );
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Erro ao buscar");

        setProdutos(data.produtos || []);
      } catch (err: any) {
        setErro(err.message || "Não foi possível buscar os produtos.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    buscar();
  }, [termo]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
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

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          <p className="text-gray-400 text-sm">Buscando os melhores preços...</p>
        </div>
      )}

      {erro && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
          <p className="text-red-500 font-medium">{erro}</p>
          <p className="text-red-400 text-sm mt-1">Tente novamente em alguns instantes.</p>
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

      {!loading && produtos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {produtos.map((produto, index) => (
            <ProductCard key={`${produto.urlProduto}-${index}`} produto={produto} />
          ))}
        </div>
      )}
    </div>
  );
}
