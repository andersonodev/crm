"use client";

import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Building2,
  Crown,
  LayoutDashboard,
  ListFilter,
  Megaphone,
  Menu,
  PackageSearch,
  PanelLeft,
  Settings2,
  Users,
} from "lucide-react";

import { SidebarItem } from "@/components/sidebar/sidebar-item";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type SidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
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
  {
    title: "Visão Geral",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Quadros",
    items: [
      { href: "/kanban?view=commercial", label: "Comercial / Novos", icon: ListFilter, iconClassName: "text-sky-300" },
      { href: "/kanban?view=sales", label: "Vendas Gerais", icon: Briefcase },
      { href: "/kanban?view=vip", label: "VIP / Top 10", icon: Crown, iconClassName: "text-yellow-500/80" },
      { href: "/kanban?view=internal", label: "Interno / Ops", icon: Building2 },
    ],
  },
  {
    title: "Gestão",
    items: [
      { href: "/clients", label: "Clientes", icon: Users },
      { href: "/products", label: "Produtos", icon: PackageSearch },
    ],
  },
  {
    title: "Mkt",
    items: [{ href: "/marketing", label: "Campanhas", icon: Megaphone }],
  },
  {
    title: "Config",
    items: [{ href: "/settings", label: "Ajustes", icon: Settings2 }],
  },
];

function SidebarContent({ isCollapsed, onNavigate }: { isCollapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className={cn("px-2 py-1", isCollapsed && "px-0 text-center")}>
        {!isCollapsed ? (
          <h2 className="text-base font-semibold text-white">CRM Turismo</h2>
        ) : (
          <span className="text-xs font-semibold text-white">CRM</span>
        )}
      </div>

      <Separator className="bg-white/10" />

      <nav className="flex-1 space-y-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed ? (
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{section.title}</p>
            ) : null}
            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  iconClassName={item.iconClassName}
                  isCollapsed={isCollapsed}
                  isActive={pathname === item.href || (item.href.startsWith("/kanban") && pathname === "/kanban")}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden h-screen border-r border-white/10 bg-[#0A2B4D]/90 shadow-xl backdrop-blur-lg",
        "transition-all duration-300 ease-in-out md:flex md:flex-col",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      <div className="flex items-center justify-between p-3">
        {!isCollapsed ? <span className="text-sm font-medium text-slate-200">Navegação</span> : <span />}
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-300 hover:bg-white/5 hover:text-white"
          onClick={onToggle}
          aria-label="Expandir ou recolher sidebar"
        >
          <PanelLeft strokeWidth={1.5} className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
        </Button>
      </div>

      <SidebarContent isCollapsed={isCollapsed} />
    </aside>
  );
}

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu strokeWidth={1.5} className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[290px] border-r border-white/10 bg-[#0A2B4D]/90 p-0 shadow-xl backdrop-blur-lg">
        <SidebarContent isCollapsed={false} />
      </SheetContent>
    </Sheet>
  );
}
