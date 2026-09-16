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
    if (!familyId) return NextResponse.json({ events: [] });

    const now = new Date();
    const events = await prisma.calendarEvent.findMany({
      where: {
        familyId,
        startTime: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      orderBy: { startTime: "asc" },
    });
    return NextResponse.json({ events });
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

    const { title, description, startTime, endTime, location } = await req.json();
    if (!title || !startTime) return NextResponse.json({ error: "Judul dan waktu mulai wajib diisi" }, { status: 400 });

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        location: location || null,
        familyId,
      },
    });
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
