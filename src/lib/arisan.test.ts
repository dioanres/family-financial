import { describe, it, expect } from "vitest";
import {
  buildPeriodDates,
  pickWinner,
  getCurrentPeriod,
  calcPot,
  wheelStopAngle,
  tomorrowRangeWIB,
  formatDateWIB,
  dueDateRangeWIB,
  buildReminderMessage,
} from "./arisan";

describe("buildPeriodDates", () => {
  it("builds N periods with correct due/draw dates across a year boundary", () => {
    const startMonth = new Date("2026-12-01T00:00:00.000Z");
    const periods = buildPeriodDates(startMonth, 3, 5, 10);
    expect(periods).toHaveLength(3);
    expect(periods[0].periodNumber).toBe(1);
    expect(periods[1].periodNumber).toBe(2);
    expect(periods[2].periodNumber).toBe(3);

    // period 1: Dec 2026
    expect(periods[0].dueDate.getUTCFullYear()).toBe(2026);
    expect(periods[0].dueDate.getUTCMonth()).toBe(11); // Dec
    // WIB midnight of the 5th is 17:00 UTC of the 4th
    expect(periods[0].dueDate.getUTCDate()).toBe(4);
    expect(periods[0].drawDate.getUTCDate()).toBe(9);

    // period 2: Jan 2027 (crosses year)
    expect(periods[1].dueDate.getUTCFullYear()).toBe(2027);
    expect(periods[1].dueDate.getUTCMonth()).toBe(0);

    // period 3: Feb 2027
    expect(periods[2].dueDate.getUTCFullYear()).toBe(2027);
    expect(periods[2].dueDate.getUTCMonth()).toBe(1);
  });

  it("handles day 28 safely for all months including February", () => {
    const startMonth = new Date("2027-01-01T00:00:00.000Z");
    const periods = buildPeriodDates(startMonth, 2, 28, 28);
    expect(periods[1].dueDate.getUTCMonth()).toBe(1); // Feb
    expect(periods[1].dueDate.getUTCDate()).toBe(27);
  });
});

describe("pickWinner", () => {
  it("picks from candidates using injected randomInt", () => {
    const candidates = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const winner = pickWinner(candidates, () => 1);
    expect(winner.id).toBe("b");
  });

  it("throws when candidates is empty", () => {
    expect(() => pickWinner([], () => 0)).toThrow();
  });
});

describe("getCurrentPeriod", () => {
  it("returns the smallest periodNumber without a winner", () => {
    const periods = [
      { periodNumber: 1, winnerMemberId: "m1" },
      { periodNumber: 2, winnerMemberId: null },
      { periodNumber: 3, winnerMemberId: null },
    ];
    expect(getCurrentPeriod(periods)?.periodNumber).toBe(2);
  });

  it("returns null when all periods have a winner", () => {
    const periods = [
      { periodNumber: 1, winnerMemberId: "m1" },
      { periodNumber: 2, winnerMemberId: "m2" },
    ];
    expect(getCurrentPeriod(periods)).toBeNull();
  });
});

describe("calcPot", () => {
  it("multiplies contribution amount by member count", () => {
    expect(calcPot(500000, 8)).toBe(4000000);
  });
});

describe("wheelStopAngle", () => {
  it("rotates the target segment's center under the fixed pointer, and is at least extraTurns*360", () => {
    // Segments are drawn clockwise from the top starting at index 0; the
    // pointer is fixed at the top (angle 0). Rotating the wheel clockwise by
    // the returned angle must bring the target segment's center to angle 0
    // (mod 360) under that fixed pointer.
    const segmentCount = 4;
    for (let target = 0; target < segmentCount; target++) {
      const angle = wheelStopAngle(target, segmentCount, 5);
      expect(angle).toBeGreaterThanOrEqual(5 * 360);
      const segmentSize = 360 / segmentCount;
      const segmentCenter = (target + 0.5) * segmentSize;
      const finalAngle = (segmentCenter + angle) % 360;
      expect(finalAngle).toBeCloseTo(0, 5);
    }
  });
});

describe("formatDateWIB", () => {
  it("renders the WIB calendar date, not the UTC date, on a UTC-clock server", () => {
    // 2026-12-04T17:00:00Z is WIB midnight of 2026-12-05 (dueDate storage convention)
    const dueDate = new Date("2026-12-04T17:00:00.000Z");
    expect(formatDateWIB(dueDate)).toBe("5 Desember 2026");
  });
});

describe("tomorrowRangeWIB", () => {
  it("returns the correct UTC range for tomorrow in WIB near midnight", () => {
    // 2026-11-10 23:30 WIB == 2026-11-10 16:30 UTC
    const now = new Date("2026-11-10T16:30:00.000Z");
    const { start, end } = tomorrowRangeWIB(now);
    // tomorrow in WIB is 2026-11-11, which starts at 2026-11-10T17:00:00Z in UTC
    expect(start.toISOString()).toBe("2026-11-10T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-11T17:00:00.000Z");
  });
});

describe("dueDateRangeWIB", () => {
  it("returns the WIB day range N days ahead near midnight", () => {
    // 2026-11-10 23:30 WIB == 2026-11-10 16:30 UTC → H+3 = 13 Nov WIB
    const now = new Date("2026-11-10T16:30:00.000Z");
    const { start, end } = dueDateRangeWIB(now, 3);
    expect(start.toISOString()).toBe("2026-11-12T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-13T17:00:00.000Z");
  });

  it("crosses a month boundary", () => {
    // 2026-11-29 08:00 WIB → H+3 = 2 Des WIB
    const now = new Date("2026-11-29T01:00:00.000Z");
    const { start } = dueDateRangeWIB(now, 3);
    expect(start.toISOString()).toBe("2026-12-01T17:00:00.000Z");
  });

  it("matches tomorrowRangeWIB when daysAhead is 1", () => {
    const now = new Date("2026-11-10T16:30:00.000Z");
    expect(dueDateRangeWIB(now, 1)).toEqual(tomorrowRangeWIB(now));
  });

  it("contains a dueDate produced by buildPeriodDates exactly 3 days later", () => {
    // jatuh tempo tgl 5 Des 2026; cron jalan 2 Des 08:00 WIB
    const [period] = buildPeriodDates(new Date("2026-12-01T00:00:00.000Z"), 1, 5, 10);
    const { start, end } = dueDateRangeWIB(new Date("2026-12-02T01:00:00.000Z"), 3);
    expect(period.dueDate.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(period.dueDate.getTime()).toBeLessThan(end.getTime());
  });
});

describe("buildReminderMessage", () => {
  const dueDate = new Date("2026-12-04T17:00:00.000Z"); // 5 Des 2026 WIB

  it("says '3 hari lagi' for H-3", () => {
    expect(buildReminderMessage({ arisanName: "RT 05", amount: 500000, dueDate, daysAhead: 3 })).toBe(
      "Pengingat: iuran arisan RT 05 Rp500.000 jatuh tempo 3 hari lagi (5 Desember 2026)"
    );
  });

  it("says 'besok' for H-1", () => {
    expect(buildReminderMessage({ arisanName: "RT 05", amount: 500000, dueDate, daysAhead: 1 })).toBe(
      "Pengingat: iuran arisan RT 05 Rp500.000 jatuh tempo besok (5 Desember 2026)"
    );
  });
});
