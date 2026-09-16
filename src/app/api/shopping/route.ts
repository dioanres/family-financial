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
    if (!familyId) return NextResponse.json({ items: [] });

    const items = await prisma.shoppingItem.findMany({
      where: { familyId },
      orderBy: [{ isBought: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ items });
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

    const { name, quantity, unit } = await req.json();
    if (!name) return NextResponse.json({ error: "Nama item wajib diisi" }, { status: 400 });

    const item = await prisma.shoppingItem.create({
      data: { name, quantity: quantity || 1, unit, familyId },
    });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
