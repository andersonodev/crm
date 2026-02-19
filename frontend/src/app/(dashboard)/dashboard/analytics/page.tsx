"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pie, PieChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DynamicChartWidget } from "@/components/analytics/DynamicChartWidget";
import { SalesFunnelChart } from "@/components/analytics/SalesFunnelChart";
import { api } from "@/lib/api";

function toBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AnalyticsDashboardPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const params = useMemo(() => ({ start_date: startDate || undefined, end_date: endDate || undefined }), [startDate, endDate]);

  const { data } = useQuery({
    queryKey: ["analytics-dashboard", params],
    queryFn: async () => (await api.get("/dashboard/analytics", { params })).data,
  });

  const kpis = data?.kpis ?? { total_revenue: 0, conversion_rate: 0, total_deals: 0, avg_ticket: 0 };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/60 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Início</label>
            <input type="date" className="rounded border px-2 py-1" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Fim</label>
            <input type="date" className="rounded border px-2 py-1" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Faturamento" value={toBRL(Number(kpis.total_revenue || 0))} />
        <Kpi title="Lucro" value={toBRL(Number((data?.revenue_trend || []).reduce((acc: number, row: any) => acc + Number(row.profit || 0), 0)))} />
        <Kpi title="Deals Ativos" value={String(kpis.total_deals || 0)} />
        <Kpi title="Ticket Médio" value={toBRL(Number(kpis.avg_ticket || 0))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DynamicChartWidget
            title="Receita vs Lucro"
            data={data?.revenue_trend || []}
            xKey="date"
            dataKey="revenue"
            compareKey="profit"
          />
        </div>
        <div className="lg:col-span-2">
          <SalesFunnelChart data={data?.funnel || []} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/60 p-4 shadow-lg backdrop-blur">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Top 5 Produtos</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.top_products || []} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={110} />
                <Tooltip />
                <Bar dataKey="sold_count" fill="hsl(var(--primary))" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/60 p-4 shadow-lg backdrop-blur">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Vendas por Origem</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.sources || []} dataKey="count" nameKey="source" innerRadius={60} outerRadius={100}>
                  {(data?.sources || []).map((_: any, idx: number) => <Cell key={idx} fill={["#0ea5e9", "#14b8a6", "#22c55e"][idx % 3]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/60 p-4 shadow-lg backdrop-blur">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}
