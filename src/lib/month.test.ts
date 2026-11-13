import { describe, it, expect } from "vitest";
import { parseMonthParam, monthRange, formatMonthLabel, shiftMonth } from "./month";

describe("parseMonthParam", () => {
  const now = new Date("2026-11-13T00:00:00");

  it("returns the current month when param is undefined", () => {
    expect(parseMonthParam(undefined, now)).toBe("2026-11");
  });

  it("returns the current month when param is empty string", () => {
    expect(parseMonthParam("", now)).toBe("2026-11");
  });

  it("returns the current month when param has an invalid month number", () => {
    expect(parseMonthParam("2026-13", now)).toBe("2026-11");
    expect(parseMonthParam("2026-00", now)).toBe("2026-11");
  });

  it("returns the current month when param is not YYYY-MM shaped", () => {
    expect(parseMonthParam("not-a-month", now)).toBe("2026-11");
  });

  it("returns the param unchanged when it is a valid YYYY-MM", () => {
    expect(parseMonthParam("2026-03", now)).toBe("2026-03");
  });
});

describe("monthRange", () => {
  it("spans the full month for a 31-day month", () => {
    const { start, end } = monthRange("2026-01");
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(31);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it("stops at Feb 28 in a non-leap year", () => {
    const { end } = monthRange("2026-02");
    expect(end.getDate()).toBe(28);
  });

  it("stops at Feb 29 in a leap year", () => {
    const { end } = monthRange("2024-02");
    expect(end.getDate()).toBe(29);
  });
});

describe("formatMonthLabel", () => {
  it("formats as Indonesian long month and year", () => {
    expect(formatMonthLabel("2026-11")).toBe("November 2026");
  });
});

describe("shiftMonth", () => {
  it("shifts backward within the same year", () => {
    expect(shiftMonth("2026-11", -1)).toBe("2026-10");
  });

  it("shifts backward across a year boundary", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("shifts forward across a year boundary", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});
