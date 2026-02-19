import * as React from "react";
import { cn } from "@/lib/utils";

export function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative overflow-hidden rounded-full bg-slate-200", className)} {...props} />;
}
export function AvatarImage(props: React.ImgHTMLAttributes<HTMLImageElement>) { return <img {...props} />; }
export function AvatarFallback({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("flex h-full w-full items-center justify-center text-xs", className)} {...props} />; }
