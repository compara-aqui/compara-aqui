"use client";

import { useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";

const MENSAGEM_MAX_LENGTH = 1000;

type Status = "idle" | "enviando" | "sucesso" | "erro";

export function FeedbackWidget() {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState("");

  function fechar() {
    setAberto(false);
    setStatus("idle");
    setErro("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("enviando");
    setErro("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, mensagem }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao enviar feedback.");
        setStatus("erro");
        return;
      }

      setStatus("sucesso");
      setNome("");
      setEmail("");
      setMensagem("");
    } catch {
      setErro("Erro ao enviar feedback. Verifique sua conexão.");
      setStatus("erro");
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-orange-500 text-white px-4 py-3 shadow-lg hover:bg-orange-600 transition"
        aria-label="Dar feedback"
      >
        <MessageSquarePlus className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Feedback</span>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl relative">
            <button
              onClick={fechar}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {status === "sucesso" ? (
              <div className="py-6 text-center">
                <p className="text-lg font-semibold text-gray-900">
                  Obrigado pelo feedback!
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Sua sugestão foi enviada com sucesso.
                </p>
                <button
                  onClick={fechar}
                  className="mt-4 rounded-full bg-orange-500 text-white px-5 py-2 text-sm font-medium hover:bg-orange-600 transition"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Deixe seu feedback
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Sugestões, problemas ou ideias para o ComparaAqui.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mensagem
                  </label>
                  <textarea
                    required
                    rows={4}
                    maxLength={MENSAGEM_MAX_LENGTH}
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Conte sua sugestão ou problema encontrado..."
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {mensagem.length}/{MENSAGEM_MAX_LENGTH}
                  </p>
                </div>

                <p className="text-xs text-gray-400">
                  Seus dados e sua mensagem são vistos apenas pela equipe do
                  ComparaAqui e usados somente para responder seu feedback.
                  Não serão divulgados publicamente nem compartilhados com
                  terceiros.
                </p>

                {status === "erro" && (
                  <p className="text-sm text-red-500">{erro}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "enviando"}
                  className="w-full rounded-full bg-orange-500 text-white py-2.5 text-sm font-medium hover:bg-orange-600 transition disabled:opacity-60"
                >
                  {status === "enviando" ? "Enviando..." : "Enviar feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
