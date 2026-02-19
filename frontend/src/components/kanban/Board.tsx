"use client";

import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useMemo, useState } from "react";

import { Column } from "@/components/kanban/Column";
import type { Deal, Pipeline } from "@/components/kanban/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMoveDeal } from "@/hooks/useMoveDeal";

type BoardProps = {
  pipeline: Pipeline;
  deals: Deal[];
};

export function Board({ pipeline, deals }: BoardProps) {
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const moveDeal = useMoveDeal();

  const dealsByStage = useMemo(() => {
    const grouped: Record<string, Deal[]> = {};
    pipeline.stages.forEach((stage) => {
      grouped[stage.key] = deals.filter((deal) => deal.stage === stage.key);
    });
    return grouped;
  }, [deals, pipeline.stages]);

  const onDragEnd = (result: DropResult) => {
    const destination = result.destination;
    if (!destination) return;

    const sourceStage = result.source.droppableId;
    const targetStage = destination.droppableId;
    if (sourceStage === targetStage) return;

    moveDeal.mutate({
      dealId: result.draggableId,
      stage: targetStage,
    });
  };

  const selectedDeal = deals.find((deal) => deal.id === selectedDealId) ?? null;

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {pipeline.stages.map((stage) => (
            <Column key={stage.key} stage={stage} deals={dealsByStage[stage.key] ?? []} onOpenDetails={setSelectedDealId} />
          ))}
        </div>
      </DragDropContext>

      <Sheet open={Boolean(selectedDeal)} onOpenChange={(open) => !open && setSelectedDealId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedDeal?.title ?? "Detalhes"}</SheetTitle>
          </SheetHeader>
          <Tabs defaultValue="summary" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="quote">Cotação</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="pt-4 text-sm">
              Cliente: {selectedDeal?.contactName}
            </TabsContent>
            <TabsContent value="timeline" className="pt-4 text-sm text-muted-foreground">
              Histórico de e-mails do thread.
            </TabsContent>
            <TabsContent value="quote" className="pt-4 text-sm text-muted-foreground">
              Serviços, custos e margens desta oportunidade.
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
