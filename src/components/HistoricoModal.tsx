"use client";
import { useState, useEffect } from "react";
import { X, TrendingDown, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  loja: string;
}

export function HistoricoModal({ isOpen, onClose, titulo, loja }: Props) {
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchHistorico() {
      setLoading(true);
      try {
        const res = await fetch(`/api/historico?titulo=${encodeURIComponent(titulo)}&loja=${encodeURIComponent(loja)}`);
        const json = await res.json();

        // Formatar data para o gráfico
        const chartData = (json.historico || []).map((h: any) => {
          const date = new Date(h.data);
          return {
            dia: `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`,
            preco: h.preco
          };
        });

        // Se houver apenas 1 ponto, adicionamos um mock para o gráfico não ficar quebrado
        if (chartData.length === 1) {
          chartData.unshift({ dia: "Antes", preco: chartData[0].preco });
        }

        setDados(chartData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchHistorico();
  }, [isOpen, titulo, loja]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-orange-500" />
            Histórico de Preços
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500 mb-6 truncate" title={titulo}>{titulo}</p>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : dados.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                  <YAxis
                    domain={['auto', 'auto']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#888' }}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `R$ ${Number(value ?? 0).toFixed(2)}`,
                      "Preço",
                    ]}
                    labelStyle={{ color: '#666' }}
                  />
                  <Line type="monotone" dataKey="preco" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              Nenhum histórico registrado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
