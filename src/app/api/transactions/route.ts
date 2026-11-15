import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserAndFamilyId } from "@/lib/family";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, familyId } = await getUserAndFamilyId(session.user.email);

    const { searchParams } = new URL(req.url);
    const personal = searchParams.get("personal") === "true";
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any;
    if (personal) {
      if (!userId) {
        return NextResponse.json({ transactions: [] });
      }
      where = { userId, isPersonal: true };
    } else {
      if (!familyId) {
        return NextResponse.json({ transactions: [] });
      }
      where = { familyId, isPersonal: false };
    }

    if (type && ["INCOME", "EXPENSE"].includes(type)) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + "T23:59:59");
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
      take: 200,
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, familyId } = await getUserAndFamilyId(session.user.email);

    const { amount, type, description, date, categoryId, personal } = await req.json();

    if (!amount || !type) {
      return NextResponse.json({ error: "Jumlah dan tipe wajib diisi" }, { status: 400 });
    }

    if (!["INCOME", "EXPENSE"].includes(type)) {
      return NextResponse.json({ error: "Tipe harus INCOME atau EXPENSE" }, { status: 400 });
    }

    if (personal === true) {
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const transaction = await prisma.transaction.create({
        data: {
          amount: parseFloat(amount),
          type,
          description,
          date: date ? new Date(date) : new Date(),
          isPersonal: true,
          userId,
          familyId: familyId ?? null,
          categoryId: categoryId || null,
        },
        include: { category: true },
      });

      return NextResponse.json({ transaction });
    }

    if (!familyId) {
      return NextResponse.json({ error: "Anda belum tergabung dalam keluarga" }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        type,
        description,
        date: date ? new Date(date) : new Date(),
        isPersonal: false,
        userId: null,
        familyId,
        categoryId: categoryId || null,
      },
      include: { category: true },
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error("Create transaction error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
