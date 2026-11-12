import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildReminderMessage, dueDateRangeWIB } from "@/lib/arisan";
import { sendNotification } from "@/lib/notify";

const REMINDERS = [
  {
    daysAhead: 3,
    notSent: { reminderH3SentAt: null },
    markSent: (at: Date) => ({ reminderH3SentAt: at }),
  },
  {
    daysAhead: 1,
    notSent: { reminderSentAt: null },
    markSent: (at: Date) => ({ reminderSentAt: at }),
  },
];

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
    const now = new Date();
    let sent = 0;

    for (const { daysAhead, notSent, markSent } of REMINDERS) {
      const { start, end } = dueDateRangeWIB(now, daysAhead);

      const payments = await prisma.arisanPayment.findMany({
        where: {
          isPaid: false,
          ...notSent,
          period: {
            dueDate: { gte: start, lt: end },
            arisan: { status: "ACTIVE" },
          },
        },
        include: { period: { include: { arisan: true } }, member: true },
      });

      for (const payment of payments) {
        await sendNotification({
          userIds: [payment.member.userId],
          title: "Pengingat iuran arisan",
          message: buildReminderMessage({
            arisanName: payment.period.arisan.name,
            amount: payment.period.arisan.contributionAmount,
            dueDate: payment.period.dueDate,
            daysAhead,
          }),
          url: `/arisan/${payment.period.arisanId}`,
        });
        await prisma.arisanPayment.update({ where: { id: payment.id }, data: markSent(now) });
        sent++;
      }
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
