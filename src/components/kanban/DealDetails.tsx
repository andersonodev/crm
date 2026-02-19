"use client";

import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";

type ServiceItem = {
  id: string;
  description: string;
  quantity: number;
  cost_price: string;
  sale_price: string;
  profit: string;
};

type DealDetailsPayload = {
  id: string;
  title: string;
  total_cost: string;
  total_revenue: string;
  gross_profit: string;
  margin_percent: string;
  service_items: ServiceItem[];
};

type Template = { id: string; name: string };

export function DealDetails({ dealId }: { dealId: string }) {
  const [details, setDetails] = useState<DealDetailsPayload | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ description: "", quantity: 1, cost_price: "0", sale_price: "0" });

  const load = async () => {
    setLoading(true);
    try {
      const [detailRes, templateRes] = await Promise.all([
        api.get(`/deals/${dealId}/details`),
        api.get("/documents/templates"),
      ]);
      setDetails(detailRes.data);
      setTemplates(templateRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [dealId]);

  const marginClass = useMemo(() => {
    const margin = Number(details?.margin_percent ?? 0);
    return margin >= 0 ? "text-emerald-600" : "text-red-600";
  }, [details?.margin_percent]);

  const addItem = async () => {
    await api.post(`/deals/${dealId}/service-items`, form);
    setForm({ description: "", quantity: 1, cost_price: "0", sale_price: "0" });
    await load();
  };

  const downloadVoucher = async (templateId: string) => {
    const response = await api.post(
      "/documents/generate",
      { deal_id: dealId, template_id: templateId },
      { responseType: "blob" },
    );
    const blobUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `voucher-${dealId}.pdf`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  };

  if (loading) return <p className="text-sm text-slate-500">Carregando detalhes...</p>;
  if (!details) return <p className="text-sm text-red-600">Não foi possível carregar o deal.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
            onClick={() => downloadVoucher(template.id)}
          >
            Gerar Voucher: {template.name}
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded border p-3">
        <h4 className="font-medium">Financeiro</h4>
        <div className="grid gap-2 md:grid-cols-4">
          <input className="rounded border px-2 py-1" placeholder="Descrição" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
          <input className="rounded border px-2 py-1" type="number" min={1} value={form.quantity} onChange={(e) => setForm((s) => ({ ...s, quantity: Number(e.target.value) || 1 }))} />
          <input className="rounded border px-2 py-1" type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm((s) => ({ ...s, cost_price: e.target.value }))} />
          <input className="rounded border px-2 py-1" type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm((s) => ({ ...s, sale_price: e.target.value }))} />
        </div>
        <button className="rounded bg-slate-900 px-3 py-1 text-sm text-white" onClick={addItem}>Adicionar item</button>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500"><th>Item</th><th>Qtd</th><th>Custo</th><th>Venda</th><th>Lucro</th></tr>
          </thead>
          <tbody>
            {details.service_items.map((item) => (
              <tr key={item.id} className="border-t">
                <td>{item.description}</td><td>{item.quantity}</td><td>R$ {item.cost_price}</td><td>R$ {item.sale_price}</td><td>R$ {item.profit}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={`rounded bg-slate-50 p-3 font-medium ${marginClass}`}>
          Lucro Estimado: R$ {details.gross_profit} ({details.margin_percent}%)
        </div>
      </div>
    </div>
  );
}
