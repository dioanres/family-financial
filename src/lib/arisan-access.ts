import { prisma } from "@/lib/prisma";

export async function getArisanMembership(arisanId: string, email: string) {
  const arisan = await prisma.arisan.findUnique({ where: { id: arisanId } });
  if (!arisan) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const member = await prisma.arisanMember.findUnique({
    where: { arisanId_userId: { arisanId, userId: user.id } },
  });
  if (!member) return null;

  return { member, arisan, user };
}
