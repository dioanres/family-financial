import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserFamilyId } from "@/lib/family";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const familyId = await getUserFamilyId(session.user.email);
    if (!familyId) return NextResponse.json({ categories: [] });

    const categories = await prisma.category.findMany({
      where: { familyId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const familyId = await getUserFamilyId(session.user.email);
    if (!familyId) return NextResponse.json({ error: "Anda belum tergabung dalam keluarga" }, { status: 400 });

    const { name, icon, color } = await req.json();
    if (!name) return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });

    const category = await prisma.category.create({
      data: { name, icon, color, familyId },
    });
    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json();
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
