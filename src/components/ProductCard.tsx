import Image from "next/image";
import { ShoppingCart } from "lucide-react";

interface ProdutoCard {
  titulo: string;
  preco: number | null;
  precoOriginal?: number | null;
  descontoPercentual?: number | null;
  imagem?: string;
  imagemUrl?: string;
  urlProduto: string;
  loja: "mercadolivre" | "amazon";
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
  const lojaLabel =
    produto.loja === "mercadolivre" ? "Mercado Livre" : "Amazon";
  const lojaColor =
    produto.loja === "mercadolivre"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-orange-100 text-orange-800";

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

  return (
    <a
      href={produto.urlProduto}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
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
          className={`absolute top-2 left-2 text-xs font-semibold px-2 py-1 rounded-full ${lojaColor}`}
        >
          {lojaLabel}
        </span>

        {produto.descontoPercentual != null && produto.descontoPercentual > 0 && (
          <span className="absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full bg-red-500 text-white">
            -{produto.descontoPercentual}%
          </span>
        )}
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

        <div className="flex items-center gap-2 mt-2 text-orange-500 text-sm font-semibold">
          <ShoppingCart className="w-4 h-4" />
          Ver oferta
        </div>
      </div>
    </a>
  );
}
