import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body.isRead !== "boolean") {
      return NextResponse.json({ error: "isRead wajib berupa boolean" }, { status: 400 });
    }
    const { isRead } = body;

    const notification = await prisma.notification.findUnique({ where: { id: params.id } });
    if (!notification || notification.userId !== user.id) {
      return NextResponse.json({ error: "Notifikasi tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.notification.update({
      where: { id: params.id },
      data: { isRead },
    });

    return NextResponse.json({ notification: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
