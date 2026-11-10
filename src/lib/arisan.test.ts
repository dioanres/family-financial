import { describe, it, expect } from "vitest";
import {
  buildPeriodDates,
  pickWinner,
  getCurrentPeriod,
  calcPot,
  wheelStopAngle,
  tomorrowRangeWIB,
  formatDateWIB,
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
