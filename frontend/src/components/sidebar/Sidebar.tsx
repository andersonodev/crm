"use client";

import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Building2,
  Crown,
  LayoutDashboard,
  ListFilter,
  Megaphone,
  PackageSearch,
  PanelLeft,
  Settings2,
  Users,
} from "lucide-react";

import { SidebarItem } from "@/components/sidebar/SidebarItem";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/theme-store";

type SidebarProps = {
  onNavigate?: () => void;
  forceVisible?: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  { title: "Visão Geral", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Quadros",
    items: [
      { href: "/kanban?view=commercial", label: "Comercial/Triagem", icon: ListFilter },
      { href: "/kanban?view=sales", label: "Vendas", icon: Briefcase },
      { href: "/kanban?view=vip", label: "VIP / Top 10", icon: Crown, iconClassName: "text-yellow-500/80" },
      { href: "/kanban?view=internal", label: "Interno", icon: Building2 },
    ],
  },
  {
    title: "Gestão",
    items: [
      { href: "/clients", label: "Clientes", icon: Users },
      { href: "/products", label: "Produtos", icon: PackageSearch },
    ],
  },
  { title: "Marketing", items: [{ href: "/marketing", label: "Campanhas", icon: Megaphone }] },
  { title: "Config", items: [{ href: "/settings", label: "Configurações", icon: Settings2 }] },
];

export function Sidebar({ onNavigate, forceVisible = false }: SidebarProps) {
  const pathname = usePathname();
  const isCollapsed = useThemeStore((state) => state.isCollapsed);
  const toggleCollapsed = useThemeStore((state) => state.toggleCollapsed);
  const logoUrl = useThemeStore((state) => state.logoUrl);

  return (
    <aside
      className={cn(
        "glass-sidebar h-screen flex-col transition-all duration-300 ease-in-out",
        forceVisible ? "flex" : "hidden md:flex",
        isCollapsed && !forceVisible ? "w-20" : "w-64",
      )}
    >
      <div className="flex items-center justify-between p-3">
        <div className={cn("overflow-hidden", isCollapsed ? "w-8" : "w-36")}>
          {logoUrl ? (
            <Image src={logoUrl} alt="Brand Logo" width={isCollapsed ? 32 : 144} height={32} className="h-8 w-auto object-contain" priority />
          ) : isCollapsed ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-sm font-semibold text-white">C</div>
          ) : (
            <h1 className="truncate text-lg font-semibold tracking-tight text-white">CRM Lux</h1>
          )}
        </div>

        <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-white/5 hover:text-white" onClick={toggleCollapsed}>
          <PanelLeft strokeWidth={1.5} className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
        </Button>
      </div>

      <Separator className="bg-white/10" />

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed ? <p className="px-2 pb-1 text-xs uppercase tracking-wide text-slate-400">{section.title}</p> : null}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isKanban = item.href.startsWith("/kanban") && pathname === "/kanban";
                const isActive = pathname === item.href || isKanban;
                const vipActive = item.label.includes("VIP") && isActive;

                return (
                  <SidebarItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    iconClassName={cn(item.iconClassName, vipActive && "text-white")}
                    isCollapsed={isCollapsed}
                    isActive={isActive}
                    onClick={onNavigate}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
