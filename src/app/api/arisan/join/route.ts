import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { joinCode } = await req.json();
    if (!joinCode) {
      return NextResponse.json({ error: "Kode arisan wajib diisi" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const arisan = await prisma.arisan.findUnique({ where: { joinCode } });
    if (!arisan) {
      return NextResponse.json({ error: "Kode arisan tidak valid" }, { status: 404 });
    }
    if (arisan.status !== "OPEN") {
      return NextResponse.json({ error: "Arisan sudah dimulai, tidak bisa bergabung" }, { status: 400 });
    }

    const existing = await prisma.arisanMember.findUnique({
      where: { arisanId_userId: { arisanId: arisan.id, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Anda sudah tergabung di arisan ini" }, { status: 400 });
    }

    await prisma.arisanMember.create({
      data: { arisanId: arisan.id, userId: user.id, role: "MEMBER" },
    });

    return NextResponse.json({ arisan: { id: arisan.id, name: arisan.name } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
