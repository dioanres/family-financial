import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, currentPassword, newPassword } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const data: { name?: string; password?: string } = {};

    if (typeof name === "string") {
      if (!name.trim()) {
        return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
      }
      data.name = name.trim();
    }

    if (newPassword) {
      if (!user.password) {
        return NextResponse.json(
          { error: "Akun ini masuk via Google dan tidak memiliki password" },
          { status: 400 }
        );
      }
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "Password baru minimal 8 karakter" },
          { status: 400 }
        );
      }
      const isValid = await compare(currentPassword || "", user.password);
      if (!isValid) {
        return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });
      }
      data.password = await hash(newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json({
      user: { id: updated.id, name: updated.name, email: updated.email },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
