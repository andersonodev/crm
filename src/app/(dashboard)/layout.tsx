"use client";

import { Menu } from "lucide-react";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {

  return (
    <ThemeProvider
      initialConfig={{
        primaryColor: "#0297A2",
        sidebarColor: "#0A2B4D",
        logoUrl: null,
      }}
    >
      <div className="flex h-screen bg-slate-50">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 flex h-14 items-center border-b bg-white/70 px-4 backdrop-blur md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu">
                  <Menu strokeWidth={1.5} className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[290px] border-r border-white/10 bg-transparent p-0">
                <Sidebar forceVisible />
              </SheetContent>
            </Sheet>
            <span className="ml-2 text-sm font-medium text-slate-700">CRM SaaS</span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
