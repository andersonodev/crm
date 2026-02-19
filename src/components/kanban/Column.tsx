"use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";

import { DealCard } from "@/components/kanban/DealCard";
import type { Deal, Stage } from "@/components/kanban/types";

type ColumnProps = {
  stage: Stage;
  deals: Deal[];
  onOpenDetails: (dealId: string) => void;
};

export function Column({ stage, deals, onOpenDetails }: ColumnProps) {
  return (
    <div className="w-80 shrink-0 rounded-lg border bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">{stage.label}</h3>
        <span className="text-xs text-muted-foreground">{deals.length}</span>
      </div>

      <Droppable droppableId={stage.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 rounded-md p-1 ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
          >
            {deals.map((deal, index) => (
              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                {(dragProvided) => (
                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                    <DealCard deal={deal} onOpenDetails={onOpenDetails} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
