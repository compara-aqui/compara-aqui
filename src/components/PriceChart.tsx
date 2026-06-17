"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { HistoricoItem } from "@/types";

interface Props {
  historico: HistoricoItem[];
}

export function PriceChart({ historico }: Props) {
  if (!historico || historico.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Histórico de preços ainda não disponível para este produto.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={historico}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="data" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(v) =>
            `R$${Number(v).toLocaleString("pt-BR", {
              minimumFractionDigits: 0,
            })}`
          }
          tick={{ fontSize: 11 }}
          width={80}
        />
        <Tooltip
          formatter={(value: unknown) => [
            Number(value).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            }),
          ]}
        />
        <Legend
          formatter={(value: string) => {
            const nomes: Record<string, string> = {
              amazon: "Amazon",
              kabum: "Kabum",
              americanas: "Americanas",
            };
            return nomes[value] ?? value;
          }}
        />
        <Line
          type="monotone"
          dataKey="amazon"
          stroke="#FF9900"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
          name="amazon"
        />
        <Line
          type="monotone"
          dataKey="kabum"
          stroke="#0E7AFE"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
          name="kabum"
        />
        <Line
          type="monotone"
          dataKey="americanas"
          stroke="#E60014"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
          name="americanas"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}