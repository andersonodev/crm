"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

type ChartMode = "line" | "bar" | "area";

type Props = {
  title: string;
  data: Array<Record<string, string | number | null>>;
  xKey: string;
  dataKey: string;
  compareKey?: string;
};

export function DynamicChartWidget({ title, data, xKey, dataKey, compareKey }: Props) {
  const [mode, setMode] = useState<ChartMode>("line");

  const chart = useMemo(() => {
    const common = (
      <>
        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip
          contentStyle={{
            background: "rgba(10,43,77,0.75)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            color: "#fff",
            backdropFilter: "blur(10px)",
          }}
        />
      </>
    );

    if (mode === "bar") {
      return (
        <BarChart data={data}>{common}<Bar dataKey={dataKey} fill="hsl(var(--primary))" radius={6} />{compareKey ? <Bar dataKey={compareKey} fill="#60a5fa" radius={6} /> : null}</BarChart>
      );
    }
    if (mode === "area") {
      return (
        <AreaChart data={data}>{common}<Area dataKey={dataKey} stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />{compareKey ? <Area dataKey={compareKey} stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.15} /> : null}</AreaChart>
      );
    }
    return (
      <LineChart data={data}>{common}<Line dataKey={dataKey} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />{compareKey ? <Line dataKey={compareKey} stroke="#60a5fa" strokeWidth={2} dot={false} /> : null}</LineChart>
    );
  }, [mode, data, dataKey, compareKey, xKey]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/60 p-4 shadow-lg backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs">
          {(["line", "bar", "area"] as const).map((item) => (
            <button key={item} onClick={() => setMode(item)} className={cn("rounded px-2 py-1", mode === item && "bg-white shadow")}>{item === "line" ? "Linha" : item === "bar" ? "Barra" : "Área"}</button>
          ))}
        </div>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>
      </div>
    </div>
  );
}
