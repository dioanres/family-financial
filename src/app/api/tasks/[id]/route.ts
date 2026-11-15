import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserAndFamilyId } from "@/lib/family";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId, familyId } = await getUserAndFamilyId(session.user.email);

    const existing = await prisma.task.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });

    if (existing.isPersonal) {
      if (existing.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (existing.familyId !== familyId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { status, title, description, priority, dueDate } = await req.json();

    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(priority && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });
    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId, familyId } = await getUserAndFamilyId(session.user.email);

    const existing = await prisma.task.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });

    if (existing.isPersonal) {
      if (existing.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (existing.familyId !== familyId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.task.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
