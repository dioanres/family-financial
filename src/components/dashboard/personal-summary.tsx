"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePersonalMode } from "@/lib/personal-mode-context";
import { formatCurrency } from "@/lib/utils";
import { monthRange } from "@/lib/month";

function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
import { getBalanceInsight } from "@/lib/dashboard-insight";
import { Wallet, TrendingUp, TrendingDown, CheckSquare, ArrowRight } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  date: string;
  categoryId: string | null;
  category: unknown;
}

interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  startDate: string;
  endDate: string;
  categoryId: string | null;
  category: unknown;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
}

export function PersonalSummary({
  month,
  monthLabel,
}: {
  month: string;
  monthLabel: string;
}) {
  const { isPersonal } = usePersonalMode();
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [budgetSummary, setBudgetSummary] = useState({
    totalBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    hasBudgets: false,
  });

  useEffect(() => {
    if (!isPersonal) return;

    let active = true;
    setLoading(true);

    async function fetchAll() {
      const { start, end } = monthRange(month);
      const from = toLocalDateString(start);
      const to = toLocalDateString(end);

      try {
        const [txRes, budgetRes, taskRes] = await Promise.all([
          fetch(`/api/transactions?personal=true&from=${from}&to=${to}`),
          fetch(`/api/budgets?personal=true&month=${month}`),
          fetch(`/api/tasks?personal=true`),
        ]);
        const [txData, budgetData, taskData] = await Promise.all([
          txRes.json(),
          budgetRes.json(),
          taskRes.json(),
        ]);

        if (!active) return;

        const transactions: Transaction[] = txData.transactions || [];
        const income = transactions
          .filter((t) => t.type === "INCOME")
          .reduce((s, t) => s + t.amount, 0);
        const expense = transactions
          .filter((t) => t.type === "EXPENSE")
          .reduce((s, t) => s + t.amount, 0);
        setTotalIncome(income);
        setTotalExpense(expense);

        const tasks: Task[] = taskData.tasks || [];
        setPendingTasks(tasks.filter((t) => t.status !== "COMPLETED").length);

        const budgets: Budget[] = budgetData.budgets || [];
        const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
        const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
        setBudgetSummary({
          totalBudget,
          totalSpent,
          totalRemaining: totalBudget - totalSpent,
          hasBudgets: budgets.length > 0,
        });
      } catch (error) {
        console.error(error);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAll();

    return () => {
      active = false;
    };
  }, [isPersonal, month]);

  if (!isPersonal) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[20vh]">
        <div className="text-muted-foreground">Memuat...</div>
      </div>
    );
  }

  const balance = totalIncome - totalExpense;
  const balanceInsight = getBalanceInsight(balance, monthLabel);

  const summaryCards = [
    {
      label: "Sisa Budget",
      value: formatCurrency(balance),
      icon: Wallet,
      color: balance >= 0 ? "text-emerald-600" : "text-destructive",
      bgColor: balance >= 0 ? "bg-emerald-50" : "bg-red-50",
      href: "/finance",
    },
    {
      label: "Pemasukan",
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      href: "/finance",
    },
    {
      label: "Pengeluaran",
      value: formatCurrency(totalExpense),
      icon: TrendingDown,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      href: "/finance",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-xl border bg-card p-5 transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {card.label}
              </span>
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon size={16} className={card.color} />
              </div>
            </div>
            <p className={`mt-2 text-xl font-bold ${card.color}`}>
              {card.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{monthLabel}</p>
          </Link>
        ))}
      </div>

      {budgetSummary.hasBudgets && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">
            🎯 Budget {monthLabel}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="mt-1 text-xl font-bold">
                {formatCurrency(budgetSummary.totalBudget)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Terpakai</p>
              <p className="mt-1 text-xl font-bold text-orange-600">
                {formatCurrency(budgetSummary.totalSpent)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sisa</p>
              <p
                className={`mt-1 text-xl font-bold ${
                  budgetSummary.totalRemaining >= 0
                    ? "text-emerald-600"
                    : "text-destructive"
                }`}
              >
                {formatCurrency(budgetSummary.totalRemaining)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Ringkasan</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/tasks"
            className="group flex items-center gap-4 rounded-xl border bg-card p-5 transition-all hover:shadow-md"
          >
            <div className="rounded-lg bg-primary/10 p-3">
              <CheckSquare size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold">{pendingTasks}</p>
              <p className="text-sm text-muted-foreground">
                tugas belum selesai
              </p>
            </div>
            <ArrowRight
              size={16}
              className="text-muted-foreground transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-3 text-lg font-semibold">💡 Insight</h3>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {balanceInsight.lead}{" "}
            <span
              className={`font-medium ${
                balanceInsight.isPositive
                  ? "text-emerald-600"
                  : "text-destructive"
              }`}
            >
              {balanceInsight.emphasisLabel} {formatCurrency(Math.abs(balance))}
            </span>{" "}
            {balanceInsight.tail}
          </p>
          {pendingTasks > 0 && (
            <p className="text-sm text-muted-foreground">
              Ada <span className="font-medium">{pendingTasks} tugas</span>{" "}
              yang belum selesai. Jangan lupa untuk menyelesaikannya!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
