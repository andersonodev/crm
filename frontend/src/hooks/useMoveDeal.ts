import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Deal } from "@/components/kanban/types";

type MoveDealPayload = {
  dealId: string;
  stage: string;
};

export function useMoveDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealId, stage }: MoveDealPayload) => {
      await api.patch(`/deals/${dealId}`, { stage });
    },
    onMutate: async ({ dealId, stage }) => {
      await queryClient.cancelQueries({ queryKey: ["deals"] });
      const previousDeals = queryClient.getQueryData<Deal[]>(["deals"]);

      queryClient.setQueryData<Deal[]>(["deals"], (current = []) =>
        current.map((deal) => (deal.id === dealId ? { ...deal, stage } : deal)),
      );

      return { previousDeals };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(["deals"], context.previousDeals);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}
