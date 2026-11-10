import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomInt } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getArisanMembership } from "@/lib/arisan-access";
import { getCurrentPeriod, pickWinner, calcPot, formatMonthWIB } from "@/lib/arisan";
import { sendNotification } from "@/lib/notify";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const access = await getArisanMembership(params.id, session.user.email);
    if (!access) return NextResponse.json({ error: "Arisan tidak ditemukan" }, { status: 404 });
    const { member, arisan } = access;

    if (member.role !== "ADMIN") {
      return NextResponse.json({ error: "Hanya admin yang dapat melakukan aksi ini" }, { status: 403 });
    }
    if (arisan.status !== "ACTIVE") {
      return NextResponse.json({ error: "Arisan belum aktif" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const periods = await tx.arisanPeriod.findMany({ where: { arisanId: arisan.id } });
      const currentPeriod = getCurrentPeriod(periods);
      if (!currentPeriod) {
        return { error: "Semua periode sudah diundi" as const };
      }

      const candidates = await tx.arisanMember.findMany({
        where: { arisanId: arisan.id, hasWon: false },
      });
      if (candidates.length === 0) {
        return { error: "Semua periode sudah diundi" as const };
      }

      const winnerMember = pickWinner(candidates, (max) => randomInt(max));

      const updateResult = await tx.arisanPeriod.updateMany({
        where: { id: currentPeriod.id, winnerMemberId: null },
        data: { winnerMemberId: winnerMember.id, drawnAt: new Date() },
      });
      if (updateResult.count === 0) {
        return { conflict: true as const };
      }

      await tx.arisanMember.update({ where: { id: winnerMember.id }, data: { hasWon: true } });

      const remaining = await tx.arisanMember.count({ where: { arisanId: arisan.id, hasWon: false } });
      let isCompleted = false;
      if (remaining === 0) {
        await tx.arisan.update({ where: { id: arisan.id }, data: { status: "COMPLETED" } });
        isCompleted = true;
      }

      const allMembers = await tx.arisanMember.findMany({ where: { arisanId: arisan.id }, include: { user: true } });
      const winnerUser = allMembers.find((m) => m.id === winnerMember.id)!;

      return {
        period: { id: currentPeriod.id, periodNumber: currentPeriod.periodNumber },
        winner: { memberId: winnerMember.id, name: winnerUser.user.name },
        isCompleted,
        allMembers,
        periodNumber: currentPeriod.periodNumber,
        memberCount: allMembers.length,
      };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if ("conflict" in result) {
      return NextResponse.json({ error: "Periode ini sudah diundi" }, { status: 409 });
    }

    const { period, winner, isCompleted, allMembers, memberCount } = result;
    const pot = calcPot(arisan.contributionAmount, memberCount);
    const periodLabel = new Date(arisan.startMonth);
    periodLabel.setUTCMonth(periodLabel.getUTCMonth() + period.periodNumber - 1);
    const monthLabel = formatMonthWIB(periodLabel);

    const winnerUserId = allMembers.find((m) => m.id === winner.memberId)!.userId;
    const otherUserIds = allMembers.filter((m) => m.id !== winner.memberId).map((m) => m.userId);

    sendNotification({
      userIds: [winnerUserId],
      title: "Selamat!",
      message: `🎉 Selamat ${winner.name}! Anda menerima arisan ${arisan.name} periode ${monthLabel} sebesar Rp${pot.toLocaleString("id-ID")}`,
      url: `/arisan/${arisan.id}`,
    }).catch((err) => console.error("sendNotification failed:", err));

    sendNotification({
      userIds: otherUserIds,
      title: "Hasil kocokan",
      message: `${winner.name} menerima arisan ${arisan.name} periode ${monthLabel}`,
      url: `/arisan/${arisan.id}`,
    }).catch((err) => console.error("sendNotification failed:", err));

    return NextResponse.json({ period, winner, isCompleted });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
