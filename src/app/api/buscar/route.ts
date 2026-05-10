import { NextRequest, NextResponse } from "next/server";
import { buscarProdutosML } from "@/lib/mercadolivre";

export async function GET(request: NextRequest) {
  const termo = request.nextUrl.searchParams.get("q");

  if (!termo || termo.trim().length < 2) {
    return NextResponse.json(
      { error: "Digite ao menos 2 caracteres" },
      { status: 400 }
    );
  }

  try {
    const produtos = await buscarProdutosML(termo.trim());
    return NextResponse.json({ produtos, total: produtos.length });
  } catch (error: any) {
    const detalhe = error?.response?.data || error?.message || "Erro desconhecido";
    console.error("Erro detalhado:", JSON.stringify(detalhe));
    return NextResponse.json(
      { error: error?.message, detalhe },
      { status: 500 }
    );
  }
}