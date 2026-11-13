"use client";

import { useRouter } from "next/navigation";
import { formatMonthLabel, shiftMonth } from "@/lib/month";

interface MonthSelectorProps {
  month: string;
  basePath: string;
}

export function MonthSelector({ month, basePath }: MonthSelectorProps) {
  const router = useRouter();

  function go(delta: number) {
    router.push(`${basePath}?month=${shiftMonth(month, delta)}`);
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <button onClick={() => go(-1)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">&larr;</button>
      <span className="text-sm font-semibold min-w-[140px] text-center">{formatMonthLabel(month)}</span>
      <button onClick={() => go(1)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">&rarr;</button>
    </div>
  );
}
