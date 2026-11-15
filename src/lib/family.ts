import { prisma } from "@/lib/prisma";

export async function getUserFamilyId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      familyMembers: {
        take: 1,
      },
    },
  });

  return user?.familyMembers[0]?.familyId || null;
}

export async function getUserAndFamilyId(
  email: string
): Promise<{ userId: string | null; familyId: string | null }> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      familyMembers: {
        take: 1,
      },
    },
  });

  return {
    userId: user?.id ?? null,
    familyId: user?.familyMembers[0]?.familyId ?? null,
  };
}
