const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function buildPeriodDates(
  startMonth: Date,
  n: number,
  dueDay: number,
  drawDay: number
): { periodNumber: number; dueDate: Date; drawDate: Date }[] {
  const periods = [];
  const baseYear = startMonth.getUTCFullYear();
  const baseMonth = startMonth.getUTCMonth();

  for (let i = 0; i < n; i++) {
    const year = baseYear + Math.floor((baseMonth + i) / 12);
    const month = (baseMonth + i) % 12;
    periods.push({
      periodNumber: i + 1,
      dueDate: wibDateToUtc(year, month, dueDay),
      drawDate: wibDateToUtc(year, month, drawDay),
    });
  }

  return periods;
}

function wibDateToUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 0, 0, 0) - WIB_OFFSET_MS);
}

export function pickWinner<T>(candidates: T[], randomInt: (max: number) => number): T {
  if (candidates.length === 0) {
    throw new Error("Tidak ada kandidat untuk diundi");
  }
  const index = randomInt(candidates.length);
  return candidates[index];
}

export function getCurrentPeriod<T extends { periodNumber: number; winnerMemberId: string | null }>(
  periods: T[]
): T | null {
  const open = periods
    .filter((p) => p.winnerMemberId === null)
    .sort((a, b) => a.periodNumber - b.periodNumber);
  return open[0] ?? null;
}

export function calcPot(amount: number, memberCount: number): number {
  return amount * memberCount;
}

export function wheelStopAngle(
  segmentIndex: number,
  segmentCount: number,
  extraTurns: number
): number {
  const segmentSize = 360 / segmentCount;
  const segmentCenter = (segmentIndex + 0.5) * segmentSize;
  // Segments are drawn clockwise from the top, with the pointer fixed at the
  // top. Rotating clockwise by (360 - segmentCenter) brings that segment's
  // center under the pointer.
  return extraTurns * 360 + ((360 - segmentCenter) % 360);
}

export function formatDateWIB(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function formatMonthWIB(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function tomorrowRangeWIB(now: Date): { start: Date; end: Date } {
  const wibNow = new Date(now.getTime() + WIB_OFFSET_MS);
  const year = wibNow.getUTCFullYear();
  const month = wibNow.getUTCMonth();
  const day = wibNow.getUTCDate();

  const start = wibDateToUtc(year, month, day + 1);
  const end = wibDateToUtc(year, month, day + 2);
  return { start, end };
}
