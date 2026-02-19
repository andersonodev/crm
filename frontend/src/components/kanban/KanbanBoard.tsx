"use client";

import { useMemo, useState } from "react";
import { MessageCircle, X } from "lucide-react";

import { DealDetails } from "@/components/kanban/DealDetails";
import { useBoardStore } from "@/store/use-board-store";

type Deal = {
  id: string;
  title: string;
  stage: string;
  priority: string;
  tags: string[];
  email_thread_id: string;
};

type Props = {
  dealsByBoard: Record<string, Deal[]>;
};

const BOARD_LABELS: Record<string, string> = {
  COMMERCIAL: "Comercial (Triagem)",
  SALES: "Vendas (Geral)",
  TOP10: "VIP / Top 10",
  INTERNAL_OPS: "Interno / Ops",
};

const TAG_CLASS: Record<string, string> = {
  NOVO_CLIENTE: "bg-blue-500",
  PRODUTO_NOVO: "bg-emerald-500",
  VIP: "bg-amber-500 text-black",
};

export function KanbanBoard({ dealsByBoard }: Props) {
  const { currentBoard, setCurrentBoard } = useBoardStore();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const base: Record<string, Deal[]> = {};
    (dealsByBoard[currentBoard] ?? []).forEach((deal) => {
      base[deal.stage] = [...(base[deal.stage] ?? []), deal];
    });
    return base;
  }, [currentBoard, dealsByBoard]);

  return (
    <div className="space-y-4">
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(BOARD_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCurrentBoard(key as any)}
            className={`rounded border px-3 py-2 text-sm ${currentBoard === key ? "bg-slate-900 text-white" : "bg-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {Object.entries(grouped).map(([stage, deals]) => (
          <div key={stage} className="w-80 shrink-0 rounded-lg border bg-muted/10 p-3">
            <div className="mb-2 text-sm font-semibold">{stage} ({deals.length})</div>
            <div className="space-y-2">
              {deals.map((deal) => (
                <button key={deal.id} className={`w-full rounded border bg-white p-3 text-left ${currentBoard === "TOP10" ? "border-amber-400" : ""}`} onClick={() => setSelectedDealId(deal.id)}>
                  <div className="pb-2 text-sm font-medium">{deal.title}</div>
                  <div className="flex flex-wrap gap-1">
                    {deal.tags.map((tag) => (
                      <span key={tag} className={`rounded px-2 py-0.5 text-xs text-white ${TAG_CLASS[tag] ?? "bg-slate-500"}`}>{tag}</span>
                    ))}
                  </div>
                  {deal.email_thread_id ? (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageCircle className="h-3.5 w-3.5" /> Mensagem Recente
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedDealId ? (
        <div className="fixed inset-0 z-50 bg-black/30">
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Detalhes da Oportunidade</h3>
              <button onClick={() => setSelectedDealId(null)}><X className="h-4 w-4" /></button>
            </div>
            <DealDetails dealId={selectedDealId} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
