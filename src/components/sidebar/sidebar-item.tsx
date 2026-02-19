"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SidebarItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive?: boolean;
  isCollapsed?: boolean;
  iconClassName?: string;
  onClick?: () => void;
};

export function SidebarItem({
  href,
  label,
  icon: Icon,
  isActive = false,
  isCollapsed = false,
  iconClassName,
  onClick,
}: SidebarItemProps) {
  const item = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
        "text-slate-300 transition-all duration-200",
        "hover:bg-white/5 hover:text-white",
        isCollapsed && "justify-center px-2",
        isActive &&
          "bg-[#0297A2]/80 text-white border border-[#0297A2]/50 border-t-white/20 shadow-[0_0_15px_rgba(2,151,162,0.3)]",
      )}
    >
      <Icon
        strokeWidth={1.5}
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          !isActive && "text-slate-300 group-hover:text-white",
          iconClassName,
        )}
      />
      {!isCollapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );

  if (!isCollapsed) return item;

  return (
    <TooltipProvider delayDuration={80}>
      <Tooltip>
        <TooltipTrigger asChild>{item}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
