"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const NONE = "__none__";
export type Option = { value: string; label: string };

/** Thin wrapper: shadcn Select with a label list and an optional "none" choice. */
export function PropSelect({
  value,
  onChange,
  options,
  className,
  disabled,
  size = "sm",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  options: Option[];
  className?: string;
  disabled?: boolean;
  size?: "sm" | "default";
}) {
  return (
    <Select items={options} value={value ?? NONE} disabled={disabled} onValueChange={(v) => onChange(v === NONE || v == null ? null : String(v))}>
      <SelectTrigger size={size} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
