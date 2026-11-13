import { describe, it, expect } from "vitest";
import { getBalanceInsight } from "./dashboard-insight";

describe("getBalanceInsight", () => {
  it("returns a positive-toned message naming the selected month when balance is positive", () => {
    const insight = getBalanceInsight(500000, "September 2026");
    expect(insight.isPositive).toBe(true);
    expect(insight.lead).toContain("September 2026");
    expect(insight.emphasisLabel).toBe("Sisa");
  });

  it("treats a zero balance as positive", () => {
    const insight = getBalanceInsight(0, "September 2026");
    expect(insight.isPositive).toBe(true);
  });

  it("returns a negative-toned message naming the selected month when balance is negative", () => {
    const insight = getBalanceInsight(-500000, "September 2026");
    expect(insight.isPositive).toBe(false);
    expect(insight.lead).toContain("September 2026");
    expect(insight.emphasisLabel).toBe("Defisit");
  });
});
