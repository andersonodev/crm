"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SalesFunnelProps = {
  data: Array<{ stage: string; deals: number; amount: number }>;
};

export function SalesFunnel({ data }: SalesFunnelProps) {
  return (
    <div className="h-[320px] w-full rounded-lg border p-3">
      <h3 className="mb-3 font-medium">Funil de Vendas</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
          <XAxis type="number" />
          <YAxis dataKey="stage" type="category" width={120} />
          <Tooltip formatter={(value, name) => (name === "amount" ? Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : value)} />
          <Bar dataKey="deals" fill="hsl(var(--primary))" name="Deals" />
          <Bar dataKey="amount" fill="hsl(var(--accent))" name="Valor" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
