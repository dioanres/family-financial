import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserFamilyId } from "@/lib/family";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const familyId = await getUserFamilyId(session.user.email);
    if (!familyId) return NextResponse.json({ budgets: [] });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // format: YYYY-MM

    let where: Record<string, unknown> = { familyId };

    if (month) {
      const [year, mon] = month.split("-").map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 0, 23, 59, 59);
      where.startDate = { lte: end };
      where.endDate = { gte: start };
    }

    const budgets = await prisma.budget.findMany({
      where,
      include: { category: true },
      orderBy: { startDate: "desc" },
    });

    // Calculate spent amount for each budget
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await prisma.transaction.aggregate({
          where: {
            familyId,
            type: "EXPENSE",
            categoryId: budget.categoryId,
            date: { gte: budget.startDate, lte: budget.endDate },
          },
          _sum: { amount: true },
        });
        return { ...budget, spent: spent._sum.amount || 0 };
      })
    );

    return NextResponse.json({ budgets: budgetsWithSpent });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const familyId = await getUserFamilyId(session.user.email);
    if (!familyId) return NextResponse.json({ error: "Anda belum tergabung dalam keluarga" }, { status: 400 });

    const { name, amount, startDate, endDate, categoryId } = await req.json();
    if (!amount || !startDate || !endDate) {
      return NextResponse.json({ error: "Nominal, tanggal mulai, dan tanggal selesai wajib diisi" }, { status: 400 });
    }

    const budget = await prisma.budget.create({
      data: {
        name: name || "",
        amount: parseFloat(amount),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        categoryId: categoryId || null,
        familyId,
      },
      include: { category: true },
    });
    return NextResponse.json({ budget });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
