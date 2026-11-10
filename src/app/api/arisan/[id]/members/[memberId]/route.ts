import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getArisanMembership } from "@/lib/arisan-access";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; memberId: string } }
) {
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
      return NextResponse.json({ error: "Anggota hanya bisa dikeluarkan sebelum arisan dimulai" }, { status: 400 });
    }

    const target = await prisma.arisanMember.findUnique({ where: { id: params.memberId } });
    if (!target || target.arisanId !== arisan.id) {
      return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
    }
    if (target.role === "ADMIN") {
      return NextResponse.json({ error: "Admin tidak bisa dikeluarkan" }, { status: 400 });
    }

    await prisma.arisanMember.delete({ where: { id: target.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
