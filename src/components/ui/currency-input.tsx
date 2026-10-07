"use client";

import { cn } from "@/lib/utils";

function formatThousands(digits: string): string {
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

interface CurrencyInputProps {
  id?: string;
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = "0",
  required,
  className,
}: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        Rp
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={formatThousands(value)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder={placeholder}
        required={required}
        className={cn(
          "w-full rounded-lg border bg-background py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
          className
        )}
      />
    </div>
  );
}
