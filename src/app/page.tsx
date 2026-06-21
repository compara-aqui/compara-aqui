"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Flame, ShieldCheck, BarChart2, Zap } from "lucide-react";

export default function Home() {
  const [termo, setTermo] = useState("");
  const router = useRouter();

  function handleBusca(e: React.FormEvent) {
    e.preventDefault();
    if (termo.trim().length < 2) return;
    router.push(`/busca?q=${encodeURIComponent(termo.trim())}`);
  }

  const sugestoes = [
    "iPhone 15",
    "Samsung Galaxy S24",
    "Notebook Dell",
    "PlayStation 5",
    "AirPods Pro",
    "Smart TV 55",
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-orange-50 to-amber-50 px-4 py-24 text-center">
        {/* Círculos decorativos de fundo */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-orange-100 opacity-50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-amber-100 opacity-50 blur-3xl" />

        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3 h-3" />
            Amazon + Kabum + Americanas em um só lugar
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight mb-4">
            Compare preços{" "}
            <span className="text-orange-500">de verdade.</span>
          </h1>

          <p className="text-lg text-gray-500 mb-10 max-w-lg mx-auto">
            Sem desconto falso, sem enganação. Compare preço e frete em tempo
            real e encontre a melhor oferta.
          </p>

          {/* Barra de busca principal */}
          <form onSubmit={handleBusca} className="relative max-w-xl mx-auto">
            <div className="flex gap-2 bg-white rounded-2xl shadow-lg shadow-orange-100 border border-orange-100 p-2">
              <div className="flex-1 flex items-center gap-3 px-2">
                <Search className="w-5 h-5 text-gray-300 shrink-0" />
                <input
                  type="text"
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="Buscar produto, marca ou modelo..."
                  className="w-full bg-transparent text-gray-800 placeholder-gray-300 focus:outline-none text-sm"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors shrink-0"
              >
                Buscar
              </button>
            </div>
          </form>

          {/* Sugestões de busca */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {sugestoes.map((s) => (
              <button
                key={s}
                onClick={() => router.push(`/busca?q=${encodeURIComponent(s)}`)}
                className="text-xs text-gray-500 hover:text-orange-500 bg-white hover:bg-orange-50 border border-gray-100 px-3 py-1.5 rounded-full transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-12">
          Por que usar o ComparaAqui?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="font-bold text-gray-800">Selo de Boas Ofertas</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Identificamos automaticamente os produtos com os melhores
              descontos, com selos de &ldquo;Ótimo Preço&rdquo; e &ldquo;Bom
              Preço&rdquo;.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-bold text-gray-800">Lojas Confiáveis</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Comparamos Amazon, Kabum e Americanas — as maiores plataformas
              do Brasil, com compra segura e garantia.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-bold text-gray-800">Comparação Direta</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Veja o mesmo produto nas duas lojas lado a lado, com preço, frete
              e disponibilidade em tempo real.
            </p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-orange-500 text-white px-4 py-16 text-center">
        <h2 className="text-3xl font-extrabold mb-3">
          Pronto para economizar?
        </h2>
        <p className="text-orange-100 mb-8 text-sm">
          Busque qualquer produto e compare agora mesmo.
        </p>
        <form onSubmit={handleBusca} className="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Ex: iPhone 15 Pro..."
            className="flex-1 bg-white text-gray-800 placeholder-gray-400 rounded-xl px-4 py-3 text-sm focus:outline-none"
          />
          <button
            type="submit"
            className="bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors shrink-0"
          >
            Buscar
          </button>
        </form>
      </section>
    </div>
  );
}
