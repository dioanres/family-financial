import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tomorrowRangeWIB } from "@/lib/arisan";
import { sendNotification } from "@/lib/notify";

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    console.error("CRON_SECRET is not set");
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { start, end } = tomorrowRangeWIB(new Date());

    const payments = await prisma.arisanPayment.findMany({
      where: {
        isPaid: false,
        reminderSentAt: null,
        period: {
          dueDate: { gte: start, lt: end },
          arisan: { status: "ACTIVE" },
        },
      },
      include: { period: { include: { arisan: true } }, member: true },
    });

    let sent = 0;
    for (const payment of payments) {
      const dueDateLabel = payment.period.dueDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      });
      await sendNotification({
        userIds: [payment.member.userId],
        title: "Pengingat iuran arisan",
        message: `Pengingat: iuran arisan ${payment.period.arisan.name} Rp${payment.period.arisan.contributionAmount.toLocaleString(
          "id-ID"
        )} jatuh tempo besok (${dueDateLabel})`,
        url: `/arisan/${payment.period.arisanId}`,
      });
      await prisma.arisanPayment.update({ where: { id: payment.id }, data: { reminderSentAt: new Date() } });
      sent++;
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
