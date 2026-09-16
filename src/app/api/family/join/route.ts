import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteCode } = await req.json();
    if (!inviteCode) {
      return NextResponse.json({ error: "Kode undangan wajib diisi" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { familyMembers: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (user.familyMembers.length > 0) {
      return NextResponse.json({ error: "Anda sudah tergabung dalam keluarga" }, { status: 400 });
    }

    const family = await prisma.family.findUnique({
      where: { inviteCode },
    });

    if (!family) {
      return NextResponse.json({ error: "Kode undangan tidak valid" }, { status: 404 });
    }

    await prisma.familyMember.create({
      data: {
        userId: user.id,
        familyId: family.id,
        role: "PARENT",
      },
    });

    return NextResponse.json({ family });
  } catch (error) {
    console.error("Join family error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
