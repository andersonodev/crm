import * as React from "react";
import { Controller, FormProvider, useFormContext, type ControllerProps, type FieldPath, type FieldValues } from "react-hook-form";

export const Form = FormProvider;

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
  props: ControllerProps<TFieldValues, TName>,
) {
  return <Controller {...props} />;
}

export function FormItem({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={className}>{children}</div>; }
export function FormLabel({ children }: { children: React.ReactNode }) { return <label className="mb-1 block text-sm font-medium">{children}</label>; }
export function FormControl({ children }: { children: React.ReactNode }) { return <>{children}</>; }
export function FormMessage() {
  const { formState } = useFormContext();
  const first = Object.values(formState.errors)[0] as any;
  if (!first?.message) return null;
  return <p className="text-xs text-red-600">{String(first.message)}</p>;
}
