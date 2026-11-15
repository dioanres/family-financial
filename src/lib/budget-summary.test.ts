import { describe, it, expect, vi, beforeEach } from "vitest";

const { findMany, aggregate } = vi.hoisted(() => ({
  findMany: vi.fn(),
  aggregate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { budget: { findMany }, transaction: { aggregate } },
}));

import { getBudgetSummaryForMonth } from "./budget-summary";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getBudgetSummaryForMonth", () => {
  it("returns zeros and hasBudgets=false when there are no overlapping budgets", async () => {
    findMany.mockResolvedValue([]);
    const result = await getBudgetSummaryForMonth({ familyId: "fam-1" }, "2026-11");
    expect(result).toEqual({ totalBudget: 0, totalSpent: 0, totalRemaining: 0, hasBudgets: false });
    expect(aggregate).not.toHaveBeenCalled();
  });

  it("sums amount and spent across multiple overlapping budgets", async () => {
    findMany.mockResolvedValue([
      { id: "b1", amount: 500000, categoryId: "cat-1", startDate: new Date("2026-11-01"), endDate: new Date("2026-11-30") },
      { id: "b2", amount: 300000, categoryId: "cat-2", startDate: new Date("2026-11-01"), endDate: new Date("2026-11-30") },
    ]);
    aggregate
      .mockResolvedValueOnce({ _sum: { amount: 200000 } })
      .mockResolvedValueOnce({ _sum: { amount: 100000 } });

    const result = await getBudgetSummaryForMonth({ familyId: "fam-1" }, "2026-11");
    expect(result).toEqual({ totalBudget: 800000, totalSpent: 300000, totalRemaining: 500000, hasBudgets: true });
  });

  it("queries budgets that overlap the month range, including partial overlaps", async () => {
    findMany.mockResolvedValue([]);
    await getBudgetSummaryForMonth({ familyId: "fam-1" }, "2026-11");
    expect(findMany).toHaveBeenCalledWith({
      where: {
        familyId: "fam-1",
        isPersonal: false,
        startDate: { lte: expect.any(Date) },
        endDate: { gte: expect.any(Date) },
      },
    });
  });

  it("treats a missing aggregate sum as zero spent", async () => {
    findMany.mockResolvedValue([
      { id: "b1", amount: 500000, categoryId: "cat-1", startDate: new Date("2026-11-01"), endDate: new Date("2026-11-30") },
    ]);
    aggregate.mockResolvedValueOnce({ _sum: { amount: null } });

    const result = await getBudgetSummaryForMonth({ familyId: "fam-1" }, "2026-11");
    expect(result).toEqual({ totalBudget: 500000, totalSpent: 0, totalRemaining: 500000, hasBudgets: true });
  });

  it("queries personal budgets by userId and isPersonal:true when given a userId scope", async () => {
    findMany.mockResolvedValue([]);
    await getBudgetSummaryForMonth({ userId: "user-1" }, "2026-11");
    expect(findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        isPersonal: true,
        startDate: { lte: expect.any(Date) },
        endDate: { gte: expect.any(Date) },
      },
    });
  });

  it("excludes personal transactions from a family budget's spent aggregate", async () => {
    findMany.mockResolvedValue([
      { id: "b1", amount: 500000, categoryId: "cat-1", startDate: new Date("2026-11-01"), endDate: new Date("2026-11-30") },
    ]);
    aggregate.mockResolvedValueOnce({ _sum: { amount: 100000 } });
    await getBudgetSummaryForMonth({ familyId: "fam-1" }, "2026-11");
    expect(aggregate).toHaveBeenCalledWith({
      where: {
        familyId: "fam-1",
        isPersonal: false,
        type: "EXPENSE",
        categoryId: "cat-1",
        date: { gte: expect.any(Date), lte: expect.any(Date) },
      },
      _sum: { amount: true },
    });
  });
});
