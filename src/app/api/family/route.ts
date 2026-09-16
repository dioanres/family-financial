import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@/lib/nanoid";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { familyMembers: { take: 1 } },
    });

    if (!user || user.familyMembers.length === 0) return NextResponse.json({ family: null });

    const family = await prisma.family.findUnique({
      where: { id: user.familyMembers[0].familyId },
      include: { members: { include: { user: { select: { name: true, email: true } } } } },
    });

    return NextResponse.json({ family });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Nama keluarga wajib diisi" }, { status: 400 });
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

    const inviteCode = nanoid(8);
    const family = await prisma.family.create({
      data: {
        name,
        inviteCode,
        members: {
          create: {
            userId: user.id,
            role: "ADMIN",
          },
        },
        categories: {
          create: [
            { name: "Makanan", icon: "🍔", color: "#f97316" },
            { name: "Transportasi", icon: "🚗", color: "#3b82f6" },
            { name: "Belanja", icon: "🛒", color: "#8b5cf6" },
            { name: "Tagihan", icon: "📄", color: "#ef4444" },
            { name: "Pendidikan", icon: "📚", color: "#06b6d4" },
            { name: "Kesehatan", icon: "🏥", color: "#10b981" },
            { name: "Hiburan", icon: "🎮", color: "#f59e0b" },
            { name: "Gaji", icon: "💰", color: "#22c55e" },
            { name: "Tabungan", icon: "🏦", color: "#0ea5e9" },
          ],
        },
      },
      include: { members: true },
    });

    return NextResponse.json({ family });
  } catch (error) {
    console.error("Create family error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
