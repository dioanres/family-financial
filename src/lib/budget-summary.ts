import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/month";

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  hasBudgets: boolean;
}

export async function getBudgetSummaryForMonth(scope: { familyId: string } | { userId: string }, monthStr: string): Promise<BudgetSummary> {
  const { start, end } = monthRange(monthStr);

  const scopeWhere = "familyId" in scope ? { familyId: scope.familyId, isPersonal: false } : { userId: scope.userId, isPersonal: true };

  const budgets = await prisma.budget.findMany({
    where: {
      ...scopeWhere,
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });

  if (budgets.length === 0) {
    return { totalBudget: 0, totalSpent: 0, totalRemaining: 0, hasBudgets: false };
  }

  let totalBudget = 0;
  let totalSpent = 0;

  for (const budget of budgets) {
    totalBudget += budget.amount;
    const spentAgg = await prisma.transaction.aggregate({
      where: {
        ...scopeWhere,
        type: "EXPENSE",
        categoryId: budget.categoryId,
        date: { gte: budget.startDate, lte: budget.endDate },
      },
      _sum: { amount: true },
    });
    totalSpent += spentAgg._sum.amount ?? 0;
  }

  return { totalBudget, totalSpent, totalRemaining: totalBudget - totalSpent, hasBudgets: true };
}
