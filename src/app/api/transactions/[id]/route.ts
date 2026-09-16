import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: { category: true },
    });
    if (!transaction) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });

    return NextResponse.json({ transaction });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount, type, description, date, categoryId } = await req.json();

    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        amount: amount ? parseFloat(amount) : undefined,
        type,
        description,
        date: date ? new Date(date) : undefined,
        categoryId: categoryId || null,
      },
      include: { category: true },
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.transaction.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
