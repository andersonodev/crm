"use client";

import { useQuery } from "@tanstack/react-query";

import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { api } from "@/lib/api";

type Deal = {
  id: string;
  title: string;
  board: string;
  stage: string;
  priority: string;
  tags: string[];
  email_thread_id: string;
};

const BOARDS = ["COMMERCIAL", "SALES", "TOP10", "INTERNAL_OPS"] as const;

export default function KanbanPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["multi-board-kanban"],
    queryFn: async () => {
      const responses = await Promise.all(BOARDS.map((board) => api.get<Deal[]>(`/boards/${board}/deals`)));
      return Object.fromEntries(responses.map((res, i) => [BOARDS[i], res.data]));
    },
  });

  if (isLoading || !data) return <div>Carregando kanban...</div>;
  return <KanbanBoard dealsByBoard={data} />;
}
