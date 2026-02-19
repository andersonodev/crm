"use client";

import { ComposedChart, Bar, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

import { SalesFunnel } from "@/components/dashboard/SalesFunnel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";

const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function DashboardPage() {
  const { data, isLoading } = useDashboardMetrics();

  if (isLoading || !data) return <div>Carregando métricas...</div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><CardTitle>Total Vendido</CardTitle></CardHeader><CardContent>{currency(data.kpis.totalSold)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Ticket Médio</CardTitle></CardHeader><CardContent>{currency(data.kpis.avgTicket)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Taxa de Conversão</CardTitle></CardHeader><CardContent>{data.kpis.conversionRate.toFixed(1)}%</CardContent></Card>
        <Card><CardHeader><CardTitle>Lucro Estimado</CardTitle></CardHeader><CardContent>{currency(data.kpis.estimatedProfit)}</CardContent></Card>
      </div>

      <SalesFunnel data={data.funnel} />

      <div className="h-[360px] rounded-lg border p-3">
        <h3 className="mb-3 font-medium">Lucratividade</h3>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.profitability}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string, item) => {
                if (name === "profit") {
                  const revenue = Number(item.payload.revenue || 0);
                  const margin = revenue ? (Number(value) / revenue) * 100 : 0;
                  return [`${currency(Number(value))} (${margin.toFixed(1)}%)`, "Lucro Líquido"];
                }
                return [currency(Number(value)), "Faturamento Bruto"];
              }}
            />
            <Bar dataKey="revenue" fill="hsl(var(--muted))" name="revenue" />
            <Line dataKey="profit" stroke="hsl(var(--primary))" name="profit" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
