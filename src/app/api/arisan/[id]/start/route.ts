import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getArisanMembership } from "@/lib/arisan-access";
import { buildPeriodDates } from "@/lib/arisan";
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
    if (arisan.status !== "OPEN") {
      return NextResponse.json({ error: "Arisan sudah dimulai" }, { status: 400 });
    }

    const members = await prisma.arisanMember.findMany({ where: { arisanId: arisan.id } });
    if (members.length < 2) {
      return NextResponse.json({ error: "Minimal 2 anggota untuk memulai arisan" }, { status: 400 });
    }

    const n = members.length;
    const periodDates = buildPeriodDates(arisan.startMonth, n, arisan.paymentDueDay, arisan.drawDay);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.arisan.update({ where: { id: arisan.id }, data: { status: "ACTIVE" } });

      const createdPeriods = [];
      for (const pd of periodDates) {
        const period = await tx.arisanPeriod.create({
          data: {
            arisanId: arisan.id,
            periodNumber: pd.periodNumber,
            dueDate: pd.dueDate,
            drawDate: pd.drawDate,
          },
        });
        createdPeriods.push(period);
      }

      await tx.arisanPayment.createMany({
        data: createdPeriods.flatMap((period) =>
          members.map((m) => ({ periodId: period.id, memberId: m.id }))
        ),
      });

      return tx.arisan.findUnique({ where: { id: arisan.id } });
    });

    await sendNotification({
      userIds: members.map((m) => m.userId),
      title: "Arisan dimulai",
      message: `Arisan ${arisan.name} dimulai`,
      url: `/arisan/${arisan.id}`,
    }).catch((err) => console.error("sendNotification failed:", err));

    return NextResponse.json({ arisan: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
