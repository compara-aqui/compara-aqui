import { NextRequest, NextResponse } from "next/server";
import { buscarProdutosAmazon } from "@/lib/mercadolivre";

export async function GET(request: NextRequest) {
  const termo = request.nextUrl.searchParams.get("q");

  if (!termo || termo.trim().length < 2) {
    return NextResponse.json(
      { error: "Digite ao menos 2 caracteres" },
      { status: 400 }
    );
  }

  try {
    // Por enquanto busca só na Amazon
    // ML será adicionado quando o scraper do ML estiver pronto
    const produtos = await buscarProdutosAmazon(termo.trim());

    // Filtra produtos sem preço para não quebrar o frontend
    const produtosValidos = produtos.filter(
      (p) => p.preco != null && p.preco > 0
    );

    return NextResponse.json({
      produtos: produtosValidos,
      total: produtosValidos.length,
    });
  } catch (error: any) {
    console.error("Erro na rota de busca:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Erro ao buscar produtos." },
      { status: 500 }
    );
  }
}
