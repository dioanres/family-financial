import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { nanoid } from "@/lib/nanoid";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentPeriod } from "@/lib/arisan";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ arisans: [] });

    const memberships = await prisma.arisanMember.findMany({
      where: { userId: user.id },
      include: {
        arisan: {
          include: { members: true, periods: true },
        },
      },
    });

    const arisans = memberships.map(({ arisan, role }) => {
      const currentPeriod = getCurrentPeriod(arisan.periods);
      return {
        id: arisan.id,
        name: arisan.name,
        status: arisan.status,
        contributionAmount: arisan.contributionAmount,
        memberCount: arisan.members.length,
        myRole: role,
        currentPeriodNumber: arisan.status === "OPEN" ? null : currentPeriod?.periodNumber ?? arisan.periods.length,
        totalPeriods: arisan.status === "OPEN" ? null : arisan.periods.length,
      };
    });

    return NextResponse.json({ arisans });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const { name, contributionAmount, paymentDueDay, drawDay, startMonth } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Nama arisan wajib diisi" }, { status: 400 });
    }
    if (!contributionAmount || Number(contributionAmount) <= 0) {
      return NextResponse.json({ error: "Iuran harus lebih dari 0" }, { status: 400 });
    }
    if (
      !Number.isInteger(paymentDueDay) ||
      paymentDueDay < 1 ||
      paymentDueDay > 28 ||
      !Number.isInteger(drawDay) ||
      drawDay < 1 ||
      drawDay > 28
    ) {
      return NextResponse.json(
        { error: "Tanggal jatuh tempo dan kocokan harus antara 1-28" },
        { status: 400 }
      );
    }
    if (!startMonth || !/^\d{4}-\d{2}$/.test(startMonth)) {
      return NextResponse.json({ error: "Bulan mulai tidak valid" }, { status: 400 });
    }

    const [year, month] = startMonth.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    if (startDate < currentMonthStart) {
      return NextResponse.json({ error: "Bulan mulai tidak boleh sebelum bulan berjalan" }, { status: 400 });
    }

    const arisan = await prisma.arisan.create({
      data: {
        name,
        contributionAmount: parseFloat(contributionAmount),
        paymentDueDay,
        drawDay,
        startMonth: startDate,
        joinCode: nanoid(8),
        createdById: user.id,
        members: {
          create: { userId: user.id, role: "ADMIN" },
        },
      },
    });

    return NextResponse.json({ arisan }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
