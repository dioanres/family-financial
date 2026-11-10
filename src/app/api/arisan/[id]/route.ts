import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getArisanMembership } from "@/lib/arisan-access";
import { getCurrentPeriod, calcPot } from "@/lib/arisan";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const access = await getArisanMembership(params.id, session.user.email);
    if (!access) return NextResponse.json({ error: "Arisan tidak ditemukan" }, { status: 404 });
    const { member, arisan } = access;

    const members = await prisma.arisanMember.findMany({
      where: { arisanId: arisan.id },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    });

    const periods = await prisma.arisanPeriod.findMany({
      where: { arisanId: arisan.id },
      include: {
        winner: { include: { user: true } },
        payments: true,
      },
      orderBy: { periodNumber: "asc" },
    });

    const currentPeriod = getCurrentPeriod(
      periods.map((p) => ({ periodNumber: p.periodNumber, winnerMemberId: p.winnerMemberId }))
    );

    return NextResponse.json({
      arisan: {
        id: arisan.id,
        name: arisan.name,
        status: arisan.status,
        contributionAmount: arisan.contributionAmount,
        paymentDueDay: arisan.paymentDueDay,
        drawDay: arisan.drawDay,
        startMonth: arisan.startMonth,
        joinCode: member.role === "ADMIN" ? arisan.joinCode : null,
      },
      myMemberId: member.id,
      myRole: member.role,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        hasWon: m.hasWon,
      })),
      periods: periods.map((p) => ({
        id: p.id,
        periodNumber: p.periodNumber,
        dueDate: p.dueDate,
        drawDate: p.drawDate,
        drawnAt: p.drawnAt,
        winner: p.winner ? { memberId: p.winner.id, name: p.winner.user.name } : null,
        payments: p.payments.map((pay) => ({ id: pay.id, memberId: pay.memberId, isPaid: pay.isPaid, paidAt: pay.paidAt })),
      })),
      currentPeriodNumber: currentPeriod?.periodNumber ?? null,
      potAmount: calcPot(arisan.contributionAmount, members.length),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
