import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn("w-full rounded-md border px-3 py-2 text-sm", className)} {...props} />,
);
Input.displayName = "Input";
