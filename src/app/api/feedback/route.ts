import { NextRequest, NextResponse, after } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MENSAGEM_MAX_LENGTH = 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const mensagem = typeof body?.mensagem === "string" ? body.mensagem.trim() : "";

  if (!nome || !email || !mensagem) {
    return NextResponse.json(
      { error: "Preencha nome, e-mail e mensagem." },
      { status: 400 }
    );
  }
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }
  if (mensagem.length > MENSAGEM_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Mensagem deve ter no máximo ${MENSAGEM_MAX_LENGTH} caracteres.` },
      { status: 400 }
    );
  }

  try {
    const feedback = await prisma.feedback.create({
      data: { nome, email, mensagem },
    });

    // Roda depois da resposta ser enviada, sem atrasar o usuário.
    // Sem o after(), a Vercel encerra a function antes da Promise terminar.
    after(() =>
      enviarEmailFeedback(feedback).catch((err) => {
        console.error("[Feedback] Erro ao enviar e-mail:", getErrorMessage(err));
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("[Feedback] Erro ao salvar feedback:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Erro ao enviar feedback. Tente novamente." },
      { status: 500 }
    );
  }
}

async function enviarEmailFeedback(feedback: {
  nome: string;
  email: string;
  mensagem: string;
  criadoEm: Date;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const destinatarios = process.env.FEEDBACK_RECIPIENT_EMAILS;

  if (!apiKey || !destinatarios) {
    console.warn(
      "[Feedback] RESEND_API_KEY ou FEEDBACK_RECIPIENT_EMAILS não configurados — e-mail não enviado."
    );
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.FEEDBACK_FROM_EMAIL || "CompraAqui <onboarding@resend.dev>",
    to: destinatarios.split(",").map((e) => e.trim()),
    replyTo: feedback.email,
    subject: `Novo feedback de ${feedback.nome}`,
    text: `Nome: ${feedback.nome}\nE-mail: ${feedback.email}\nEnviado em: ${feedback.criadoEm.toLocaleString("pt-BR")}\n\nMensagem:\n${feedback.mensagem}`,
  });
}
