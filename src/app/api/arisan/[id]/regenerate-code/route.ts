import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { nanoid } from "@/lib/nanoid";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getArisanMembership } from "@/lib/arisan-access";

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
      return NextResponse.json({ error: "Kode hanya bisa diubah saat arisan belum dimulai" }, { status: 400 });
    }

    const joinCode = nanoid(8);
    await prisma.arisan.update({ where: { id: arisan.id }, data: { joinCode } });

    return NextResponse.json({ joinCode });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
