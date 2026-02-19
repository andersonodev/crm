import * as React from "react";

type Props = {
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
};

export function Switch({ checked, onCheckedChange }: Props) {
  return <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />;
}
