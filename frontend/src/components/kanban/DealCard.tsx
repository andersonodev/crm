"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Deal } from "./types";

type DealCardProps = {
  deal: Deal;
  onOpenDetails: (dealId: string) => void;
};

export function DealCard({ deal, onOpenDetails }: DealCardProps) {
  return (
    <Card className="cursor-pointer shadow-sm transition hover:shadow-md" onClick={() => onOpenDetails(deal.id)}>
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="text-sm font-semibold">{deal.title}</CardTitle>
        <p className="text-xs text-muted-foreground">{deal.contactName}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm font-medium">
          {deal.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </div>
        <div className="flex flex-wrap gap-1">
          {deal.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex justify-end">
          <Avatar className="h-7 w-7">
            <AvatarImage src={deal.ownerAvatar} alt="Vendedor" />
            <AvatarFallback>VD</AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  );
}
