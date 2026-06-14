import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const titulo = request.nextUrl.searchParams.get("titulo");
  const loja = request.nextUrl.searchParams.get("loja");

  if (!titulo || !loja) {
    return NextResponse.json(
      { error: "Parâmetros 'titulo' e 'loja' são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const produto = await prisma.produto.findUnique({
      where: {
        titulo_loja: {
          titulo: titulo,
          loja: loja,
        },
      },
      include: {
        historico: {
          orderBy: { data: "asc" },
        },
      },
    });

    if (!produto) {
      return NextResponse.json({ historico: [] });
    }

    // Simplificamos os dados para o gráfico (agrupando por dia/hora ou retornando raw se for pequeno)
    const historico = produto.historico.map((h) => ({
      data: h.data,
      preco: h.preco,
    }));

    return NextResponse.json({ historico });
  } catch (error: any) {
    console.error("[API Historico] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar histórico" },
      { status: 500 }
    );
  }
}
