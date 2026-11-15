import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, getGreeting } from "@/lib/utils";
import { parseMonthParam, monthRange, formatMonthLabel } from "@/lib/month";
import { getBudgetSummaryForMonth } from "@/lib/budget-summary";
import { getBalanceInsight } from "@/lib/dashboard-insight";
import { MonthSelector } from "@/components/month-selector";
import { FamilyOnly } from "@/components/dashboard/mode-aware";
import { PersonalSummary } from "@/components/dashboard/personal-summary";
import {
  Wallet,
  CheckSquare,
  ShoppingCart,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { familyMembers: { include: { family: true } } },
  });

  const familyId = user?.familyMembers[0]?.familyId;
  const familyName = user?.familyMembers[0]?.family?.name || "Keluarga";
  const displayName = user?.name || session.user.email;
  const month = parseMonthParam(searchParams?.month);
  const { start: startOfMonth, end: endOfMonth } = monthRange(month);
  const monthLabel = formatMonthLabel(month);

  let totalIncome = 0, totalExpense = 0, pendingTasks = 0, shoppingItems = 0, monthEvents = 0;

  if (familyId) {
    const transactions = await prisma.transaction.findMany({
      where: { familyId, date: { gte: startOfMonth, lte: endOfMonth } },
    });
    totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    totalExpense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
    pendingTasks = await prisma.task.count({ where: { familyId, status: { not: "COMPLETED" } } });
    shoppingItems = await prisma.shoppingItem.count({ where: { familyId, isBought: false } });
    monthEvents = await prisma.calendarEvent.count({ where: { familyId, startTime: { gte: startOfMonth, lte: endOfMonth } } });
  }

  const budgetSummary = familyId
    ? await getBudgetSummaryForMonth({ familyId }, month)
    : { totalBudget: 0, totalSpent: 0, totalRemaining: 0, hasBudgets: false };

  const balance = totalIncome - totalExpense;
  const balanceInsight = getBalanceInsight(balance, monthLabel);
  const greeting = getGreeting();

  const summaryCards = [
    { label: "Sisa Budget", value: formatCurrency(balance), icon: Wallet, color: balance >= 0 ? "text-emerald-600" : "text-destructive", bgColor: balance >= 0 ? "bg-emerald-50" : "bg-red-50", href: "/finance" },
    { label: "Pemasukan", value: formatCurrency(totalIncome), icon: TrendingUp, color: "text-emerald-600", bgColor: "bg-emerald-50", href: "/finance" },
    { label: "Pengeluaran", value: formatCurrency(totalExpense), icon: TrendingDown, color: "text-orange-600", bgColor: "bg-orange-50", href: "/finance" },
  ];

  const quickActions = [
    { label: "Tugas", count: pendingTasks, icon: CheckSquare, href: "/tasks", description: "tugas belum selesai" },
    { label: "Belanja", count: shoppingItems, icon: ShoppingCart, href: "/shopping", description: "item perlu dibeli" },
    { label: "Agenda", count: monthEvents, icon: Calendar, href: "/calendar", description: `acara ${monthLabel}` },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting} 👋</h1>
        <p className="text-muted-foreground mt-1">
          Selamat Datang <span className="font-medium text-foreground">{displayName}</span> di{" "}
          <span className="font-medium text-foreground">{familyName}</span>
        </p>
      </div>

      <MonthSelector month={month} basePath="/dashboard" />

      <PersonalSummary month={month} monthLabel={monthLabel} />

      <FamilyOnly>
        <div className="grid gap-4 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <Link key={card.label} href={card.href} className="group rounded-xl border bg-card p-5 transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                <div className={`rounded-lg p-2 ${card.bgColor}`}><card.icon size={16} className={card.color} /></div>
              </div>
              <p className={`mt-2 text-xl font-bold ${card.color}`}>{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{monthLabel}</p>
            </Link>
          ))}
        </div>
      </FamilyOnly>

      <FamilyOnly>
        {budgetSummary.hasBudgets && (
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">🎯 Budget {monthLabel}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="mt-1 text-xl font-bold">{formatCurrency(budgetSummary.totalBudget)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Terpakai</p>
                <p className="mt-1 text-xl font-bold text-orange-600">{formatCurrency(budgetSummary.totalSpent)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sisa</p>
                <p className={`mt-1 text-xl font-bold ${budgetSummary.totalRemaining >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {formatCurrency(budgetSummary.totalRemaining)}
                </p>
              </div>
            </div>
          </div>
        )}
      </FamilyOnly>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Ringkasan</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) =>
            action.label === "Tugas" ? (
              <FamilyOnly key={action.label}>
                <Link href={action.href} className="group flex items-center gap-4 rounded-xl border bg-card p-5 transition-all hover:shadow-md">
                  <div className="rounded-lg bg-primary/10 p-3"><action.icon size={20} className="text-primary" /></div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold">{action.count}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              </FamilyOnly>
            ) : (
              <Link key={action.label} href={action.href} className="group flex items-center gap-4 rounded-xl border bg-card p-5 transition-all hover:shadow-md">
                <div className="rounded-lg bg-primary/10 p-3"><action.icon size={20} className="text-primary" /></div>
                <div className="flex-1">
                  <p className="text-2xl font-bold">{action.count}</p>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
                <ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            )
          )}
        </div>
      </div>

      {!familyId && (
        <div className="rounded-xl border-dashed border bg-card p-8 text-center">
          <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
          <h3 className="text-lg font-semibold">Buat Grup Keluarga</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Undang anggota keluarga Anda untuk mulai mengelola keuangan, tugas, dan agenda bersama.
          </p>
          <Link href="/settings" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Mulai Sekarang
          </Link>
        </div>
      )}

      {familyId && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-3 text-lg font-semibold">💡 Insight</h3>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {balanceInsight.lead}{" "}
              <span className={`font-medium ${balanceInsight.isPositive ? "text-emerald-600" : "text-destructive"}`}>
                {balanceInsight.emphasisLabel} {formatCurrency(Math.abs(balance))}
              </span>{" "}
              {balanceInsight.tail}
            </p>
            {pendingTasks > 0 && (
              <p className="text-sm text-muted-foreground">
                Ada <span className="font-medium">{pendingTasks} tugas</span> yang belum selesai. Jangan lupa untuk menyelesaikannya!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}