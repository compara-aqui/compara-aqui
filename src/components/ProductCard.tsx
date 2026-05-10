import Image from "next/image";
import { ResultadoBusca } from "@/types";
import { ShoppingCart } from "lucide-react";

interface Props {
  produto: ResultadoBusca;
}

export function ProductCard({ produto }: Props) {
  const lojaLabel =
    produto.loja === "mercadolivre" ? "Mercado Livre" : "Amazon";
  const lojaColor =
    produto.loja === "mercadolivre"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-orange-100 text-orange-800";

  return (
    <a
      href={produto.urlProduto}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <Image
          src={produto.imagem || "/placeholder.png"}
          alt={produto.titulo}
          fill
          className="object-contain p-4 group-hover:scale-105 transition-transform duration-200"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        <span
          className={`absolute top-2 left-2 text-xs font-semibold px-2 py-1 rounded-full ${lojaColor}`}
        >
          {lojaLabel}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="text-sm text-gray-700 line-clamp-2 leading-snug font-medium">
          {produto.titulo}
        </p>

        <div className="mt-auto">
          <p className="text-xl font-bold text-gray-900">
            {produto.preco.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
          <p className="text-xs text-green-600 font-medium mt-1">
            {produto.frete === 0 ? "Frete gratis" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-2 text-orange-500 text-sm font-semibold">
          <ShoppingCart className="w-4 h-4" />
          Ver oferta
        </div>
      </div>
    </a>
  );
}
