import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getArisanMembership } from "@/lib/arisan-access";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; paymentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const access = await getArisanMembership(params.id, session.user.email);
    if (!access) return NextResponse.json({ error: "Arisan tidak ditemukan" }, { status: 404 });
    const { member, arisan } = access;

    if (member.role !== "ADMIN") {
      return NextResponse.json({ error: "Hanya admin yang dapat melakukan aksi ini" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.isPaid !== "boolean") {
      return NextResponse.json({ error: "isPaid wajib berupa boolean" }, { status: 400 });
    }
    const { isPaid } = body;

    const payment = await prisma.arisanPayment.findUnique({
      where: { id: params.paymentId },
      include: { period: true },
    });
    if (!payment || payment.period.arisanId !== arisan.id) {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.arisanPayment.update({
      where: { id: payment.id },
      data: { isPaid, paidAt: isPaid ? new Date() : null },
    });

    return NextResponse.json({ payment: { id: updated.id, isPaid: updated.isPaid, paidAt: updated.paidAt } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
