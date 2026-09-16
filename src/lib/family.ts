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
