import * as React from "react";
import { cn } from "@/lib/utils";

const Ctx = React.createContext<{ open: boolean; setOpen: (v: boolean) => void } | null>(null);

export function Sheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}
export function SheetTrigger({ children }: { children: React.ReactElement; asChild?: boolean }) {
  const ctx = React.useContext(Ctx);
  return React.cloneElement(children, { onClick: () => ctx?.setOpen(true) } as any);
}
export function SheetContent({ children, className }: { children: React.ReactNode; side?: string; className?: string }) {
  const ctx = React.useContext(Ctx);
  if (!ctx?.open) return null;
  return <div className="fixed inset-0 z-50 bg-black/30"><div className={cn("h-full w-[85%] max-w-sm bg-white p-3", className)}>{children}</div></div>;
}
