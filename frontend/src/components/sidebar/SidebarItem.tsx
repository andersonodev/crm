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
        "group flex h-11 items-center gap-3 rounded-md px-3",
        "text-slate-300 transition-all duration-200",
        "hover:bg-white/5 hover:text-white",
        isCollapsed && "justify-center px-2",
        isActive &&
          "border-l-2 border-white bg-[var(--primary-color)] text-white font-medium shadow-[0_0_15px_rgba(0,0,0,0.3)]",
      )}
    >
      <Icon
        strokeWidth={1.5}
        className={cn(
          "h-5 w-5 shrink-0 text-slate-400 transition-colors duration-200",
          "group-hover:text-white",
          isActive && "text-white",
          iconClassName,
        )}
      />
      {!isCollapsed ? <span className="truncate text-sm">{label}</span> : null}
    </Link>
  );

  if (!isCollapsed) return item;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>{item}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
