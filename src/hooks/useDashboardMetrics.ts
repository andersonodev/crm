import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

type StageMetric = {
  stage: string;
  deals: number;
  amount: number;
};

type RevenueMetric = {
  month: string;
  revenue: number;
  profit: number;
};

export type DashboardMetrics = {
  kpis: {
    totalSold: number;
    avgTicket: number;
    conversionRate: number;
    estimatedProfit: number;
  };
  funnel: StageMetric[];
  profitability: RevenueMetric[];
};

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const response = await api.get<DashboardMetrics>("/dashboard/metrics");
      return response.data;
    },
  });
}
