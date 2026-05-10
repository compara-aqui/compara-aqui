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
          formatter={(value: string) =>
            value === "mercadolivre" ? "Mercado Livre" : "Amazon"
          }
        />
        <Line
          type="monotone"
          dataKey="mercadolivre"
          stroke="#F6A30B"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
          name="mercadolivre"
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
      </LineChart>
    </ResponsiveContainer>
  );
}