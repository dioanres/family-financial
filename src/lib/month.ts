const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function formatYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthParam(param?: string | null, now: Date = new Date()): string {
  if (param && MONTH_PATTERN.test(param)) {
    return param;
  }
  return formatYearMonth(now);
}

function toYearMonthIndex(monthStr: string): { year: number; monthIndex: number } {
  const [year, month] = monthStr.split("-").map(Number);
  return { year, monthIndex: month - 1 };
}

export function monthRange(monthStr: string): { start: Date; end: Date } {
  const { year, monthIndex } = toYearMonthIndex(monthStr);
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function formatMonthLabel(monthStr: string): string {
  const { year, monthIndex } = toYearMonthIndex(monthStr);
  return new Date(year, monthIndex, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(monthStr: string, delta: number): string {
  const { year, monthIndex } = toYearMonthIndex(monthStr);
  const total = year * 12 + monthIndex + delta;
  const newYear = Math.floor(total / 12);
  const newMonthIndex = ((total % 12) + 12) % 12;
  return `${newYear}-${String(newMonthIndex + 1).padStart(2, "0")}`;
}
