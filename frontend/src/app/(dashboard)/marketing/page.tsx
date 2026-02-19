"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";

type Campaign = { id: string; subject: string; status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" };

const STATUS_CLASS: Record<Campaign["status"], string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  SENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-emerald-100 text-emerald-700",
};

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    api.get("/marketing/campaigns").then((res) => setCampaigns(res.data));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Campanhas</h1>
        <Link href="/marketing/editor" className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Nova Campanha</Link>
      </div>

      <table className="w-full rounded border bg-white text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="p-3">Assunto</th>
            <th className="p-3">Status</th>
            <th className="p-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.id} className="border-b">
              <td className="p-3">{campaign.subject}</td>
              <td className="p-3"><span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_CLASS[campaign.status]}`}>{campaign.status}</span></td>
              <td className="p-3">
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={async () => {
                    await api.post(`/marketing/campaigns/${campaign.id}/send`);
                    setCampaigns((prev) => prev.map((item) => item.id === campaign.id ? { ...item, status: "SCHEDULED" } : item));
                  }}
                >
                  Disparar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
