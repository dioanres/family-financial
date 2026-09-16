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
    if (!familyId) return NextResponse.json({ tasks: [] });

    const tasks = await prisma.task.findMany({
      where: { familyId },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });
    return NextResponse.json({ tasks });
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

    const { title, description, priority, dueDate } = await req.json();
    if (!title) return NextResponse.json({ error: "Judul tugas wajib diisi" }, { status: 400 });

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || "LOW",
        dueDate: dueDate ? new Date(dueDate) : null,
        familyId,
      },
    });
    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
