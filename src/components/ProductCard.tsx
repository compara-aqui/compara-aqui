"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, Heart, Flame, ThumbsUp, Scale } from "lucide-react";
import type { ProdutoAgrupado } from "@/lib/agrupar-produtos";

interface Props {
  produto: ProdutoAgrupado;
}

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

export function ProductCard({ produto }: Props) {
  const router = useRouter();
  const melhorOferta = produto.ofertas[0];
  const outrasLojas = produto.ofertas.length - 1;

  const lojaLabel = LOJA_LABELS[melhorOferta.loja] ?? melhorOferta.loja;
  const lojaColor = LOJA_CORES[melhorOferta.loja] ?? "bg-gray-100 text-gray-800";

  const precoFormatado = melhorOferta.preco.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const precoOriginalFormatado =
    melhorOferta.precoOriginal != null
      ? melhorOferta.precoOriginal.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : null;

  const getDealScore = () => {
    if (!melhorOferta.descontoPercentual) return null;
    if (melhorOferta.descontoPercentual >= 20) return { label: "Ótimo Preço", icon: Flame, color: "text-red-500", bg: "bg-red-50 border-red-100" };
    if (melhorOferta.descontoPercentual >= 10) return { label: "Bom Preço", icon: ThumbsUp, color: "text-blue-500", bg: "bg-blue-50 border-blue-100" };
    return null;
  };
  const deal = getDealScore();

  function abrirComparacao() {
    const dados = encodeURIComponent(JSON.stringify(produto));
    router.push(`/produto?d=${dados}`);
  }

  return (
    <div
      onClick={abrirComparacao}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col relative cursor-pointer"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {produto.imagemUrl ? (
          <Image
            src={produto.imagemUrl}
            alt={produto.titulo}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 768px) 50vw, 25vw"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            Sem imagem
          </div>
        )}

        <span
          className={`absolute top-2 left-2 text-xs font-semibold px-2 py-1 rounded-full ${lojaColor} shadow-sm z-10`}
        >
          {lojaLabel}
        </span>

        {melhorOferta.descontoPercentual != null && melhorOferta.descontoPercentual > 0 && (
          <span className="absolute bottom-2 left-2 text-xs font-bold px-2 py-1 rounded-full bg-red-500 text-white shadow-sm z-10">
            -{melhorOferta.descontoPercentual}%
          </span>
        )}

        <button
          className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10 shadow-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Lógica de alerta/favoritos no futuro
            alert("Produto adicionado aos alertas!");
          }}
          title="Criar Alerta de Preço"
        >
          <Heart className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="text-sm text-gray-700 line-clamp-2 leading-snug font-medium">
          {produto.titulo}
        </p>

        {melhorOferta.avaliacao != null && (
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-xs text-gray-500">{melhorOferta.avaliacao.toFixed(1)}</span>
          </div>
        )}

        {deal && (
          <div className={`flex items-center gap-1 mt-1 px-2 py-1 rounded-md text-xs font-medium w-fit border ${deal.bg} ${deal.color}`}>
            <deal.icon className="w-3 h-3" />
            {deal.label}
          </div>
        )}

        <div className="mt-auto">
          {precoOriginalFormatado && (
            <p className="text-xs text-gray-400 line-through">
              {precoOriginalFormatado}
            </p>
          )}
          <p className="text-xl font-bold text-gray-900">{precoFormatado}</p>
          {melhorOferta.freteGratis && (
            <p className="text-xs text-green-600 font-medium mt-1">
              ✓ Frete gratis
            </p>
          )}
          {melhorOferta.isPrime && (
            <p className="text-xs text-blue-600 font-medium">Prime</p>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <a
            href={melhorOferta.urlProduto}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2 px-1 rounded-xl transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Comprar
          </a>
          <button
            className="flex-1 flex items-center justify-center gap-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-semibold py-2 px-1 rounded-xl transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              abrirComparacao();
            }}
          >
            <Scale className="w-3.5 h-3.5" />
            {outrasLojas > 0 ? `+${outrasLojas} loja${outrasLojas > 1 ? "s" : ""}` : "Comparar"}
          </button>
        </div>
      </div>
    </div>
  );
}
