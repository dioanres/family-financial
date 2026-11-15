import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserAndFamilyId } from "@/lib/family";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId, familyId } = await getUserAndFamilyId(session.user.email);

    const { searchParams } = new URL(req.url);
    const personal = searchParams.get("personal") === "true";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any;
    if (personal) {
      if (!userId) {
        return NextResponse.json({ tasks: [] });
      }
      where = { userId, isPersonal: true };
    } else {
      if (!familyId) {
        return NextResponse.json({ tasks: [] });
      }
      where = { familyId, isPersonal: false };
    }

    const tasks = await prisma.task.findMany({
      where,
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

    const { userId, familyId } = await getUserAndFamilyId(session.user.email);

    const { title, description, priority, dueDate, personal } = await req.json();
    if (!title) return NextResponse.json({ error: "Judul tugas wajib diisi" }, { status: 400 });

    if (personal === true) {
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const task = await prisma.task.create({
        data: {
          title,
          description,
          priority: priority || "LOW",
          dueDate: dueDate ? new Date(dueDate) : null,
          isPersonal: true,
          userId,
          familyId: familyId ?? null,
        },
      });
      return NextResponse.json({ task });
    }

    if (!familyId) return NextResponse.json({ error: "Anda belum tergabung dalam keluarga" }, { status: 400 });

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || "LOW",
        dueDate: dueDate ? new Date(dueDate) : null,
        isPersonal: false,
        userId: null,
        familyId,
      },
    });
    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
