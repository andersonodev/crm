import * as React from "react";
import { cn } from "@/lib/utils";

const Ctx = React.createContext<{ open: boolean; setOpen: (v: boolean) => void } | null>(null);

export function Dialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}
export function DialogTrigger({ children }: { children: React.ReactElement; asChild?: boolean }) {
  const ctx = React.useContext(Ctx);
  return React.cloneElement(children, { onClick: () => ctx?.setOpen(true) } as any);
}
export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(Ctx);
  if (!ctx?.open) return null;
  return <div className="fixed inset-0 z-50 bg-black/30"><div className={cn("mx-auto mt-20 w-[90%] rounded bg-white p-4", className)}>{children}</div></div>;
}
export function DialogHeader({ children }: { children: React.ReactNode }) { return <div className="mb-2">{children}</div>; }
export function DialogTitle({ children }: { children: React.ReactNode }) { return <h3 className="font-semibold">{children}</h3>; }
