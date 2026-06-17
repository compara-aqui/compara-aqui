"use client";
import { useState } from "react";
import Image from "next/image";
import { ShoppingCart, Heart, Flame, ThumbsUp, TrendingDown } from "lucide-react";
import { HistoricoModal } from "./HistoricoModal";

interface ProdutoCard {
  titulo: string;
  preco: number | null;
  precoOriginal?: number | null;
  descontoPercentual?: number | null;
  imagem?: string;
  imagemUrl?: string;
  urlProduto: string;
  loja: "amazon" | "kabum" | "americanas";
  frete?: number;
  freteGratis?: boolean;
  avaliacao?: number | null;
  numAvaliacoes?: number | null;
  isPrime?: boolean;
}

interface Props {
  produto: ProdutoCard;
}

export function ProductCard({ produto }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const lojaLabels: Record<typeof produto.loja, string> = {
    amazon: "Amazon",
    kabum: "Kabum",
    americanas: "Americanas",
  };
  const lojaColors: Record<typeof produto.loja, string> = {
    amazon: "bg-orange-100 text-orange-800",
    kabum: "bg-blue-100 text-blue-800",
    americanas: "bg-red-100 text-red-800",
  };
  const lojaLabel = lojaLabels[produto.loja];
  const lojaColor = lojaColors[produto.loja];

  const imagem = produto.imagemUrl || produto.imagem || "";
  const freteGratis =
    produto.freteGratis || produto.frete === 0;

  const precoFormatado =
    produto.preco != null
      ? produto.preco.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : "Ver preço";

  const precoOriginalFormatado =
    produto.precoOriginal != null
      ? produto.precoOriginal.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : null;

  const getDealScore = () => {
    if (!produto.descontoPercentual) return null;
    if (produto.descontoPercentual >= 20) return { label: "Ótimo Preço", icon: Flame, color: "text-red-500", bg: "bg-red-50 border-red-100" };
    if (produto.descontoPercentual >= 10) return { label: "Bom Preço", icon: ThumbsUp, color: "text-blue-500", bg: "bg-blue-50 border-blue-100" };
    return null;
  };
  const deal = getDealScore();

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col relative"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {imagem ? (
          <Image
            src={imagem}
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

        {produto.descontoPercentual != null && produto.descontoPercentual > 0 && (
          <span className="absolute bottom-2 left-2 text-xs font-bold px-2 py-1 rounded-full bg-red-500 text-white shadow-sm z-10">
            -{produto.descontoPercentual}%
          </span>
        )}

        <button 
          className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10 shadow-sm"
          onClick={(e) => {
            e.preventDefault();
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

        {produto.avaliacao != null && (
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-xs text-gray-500">{produto.avaliacao.toFixed(1)}</span>
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
          {freteGratis && (
            <p className="text-xs text-green-600 font-medium mt-1">
              ✓ Frete gratis
            </p>
          )}
          {produto.isPrime && (
            <p className="text-xs text-blue-600 font-medium">Prime</p>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <a
            href={produto.urlProduto}
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
              setModalOpen(true);
            }}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Histórico
          </button>
        </div>
      </div>

      <HistoricoModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        titulo={produto.titulo} 
        loja={produto.loja} 
      />
    </div>
  );
}
