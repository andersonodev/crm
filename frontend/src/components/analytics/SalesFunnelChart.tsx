"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type FunnelPoint = {
  stage: string;
  count: number;
  value: number;
};

const STAGE_LABELS: Record<string, string> = {
  NEW: "Solicitação",
  QUALIFIED: "Orçamento",
  PROPOSAL: "Negociação",
  NEGOTIATION: "Fechado",
  WON: "Operação",
};

const COLORS = ["#1d4ed8", "#2563eb", "#0ea5e9", "#14b8a6", "#22c55e"];

export function SalesFunnelChart({ data }: { data: FunnelPoint[] }) {
  const withConversion = data.map((item, idx) => {
    const next = data[idx + 1];
    const conversionToNext = next && item.count ? (next.count / item.count) * 100 : 0;
    return { ...item, stageLabel: STAGE_LABELS[item.stage] ?? item.stage, conversionToNext };
  });

  return (
    <div className="rounded-xl border border-white/10 bg-white/60 p-4 shadow-lg backdrop-blur">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Funil de Vendas</h3>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={withConversion} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="stageLabel" width={90} />
            <Tooltip
              formatter={(value: number, key: string, item: any) => {
                if (key === "count") return [value, "Deals"];
                if (key === "value") return [`R$ ${Number(value).toLocaleString("pt-BR")}`, "Valor Total"];
                return [value, key];
              }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload;
                return (
                  <div className="rounded-xl border border-white/20 bg-[#0A2B4D]/80 p-3 text-xs text-white backdrop-blur">
                    <p className="font-medium">{row.stageLabel}</p>
                    <p>Deals: {row.count}</p>
                    <p>Valor: R$ {Number(row.value).toLocaleString("pt-BR")}</p>
                    <p>Conversão próxima: {Number(row.conversionToNext).toFixed(1)}%</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={6}>
              {withConversion.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
