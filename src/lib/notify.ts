import { prisma } from "@/lib/prisma";
import { sendOneSignalPush } from "@/lib/onesignal";
import { renderEmailTemplate, sendEmail } from "@/lib/mailer";

interface SendNotificationParams {
  userIds: string[];
  title: string;
  message: string;
  url?: string;
}

export function toAbsoluteUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  const base = process.env.NEXTAUTH_URL;
  if (!base) return url;
  return new URL(url, base).toString();
}

async function sendEmailToUsers(userIds: string[], title: string, message: string, url?: string) {
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { email: true } });
  const emails = users.map((u) => u.email).filter((email): email is string => !!email);
  if (emails.length === 0) return;

  await sendEmail({ to: emails, ...renderEmailTemplate({ title, message, url }) });
}

export async function sendNotification({ userIds, title, message, url }: SendNotificationParams) {
  if (userIds.length === 0) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, title, message, url })),
  });

  const absoluteUrl = toAbsoluteUrl(url);
  const [push, email] = await Promise.allSettled([
    sendOneSignalPush({ userIds, heading: title, content: message, url: absoluteUrl }),
    sendEmailToUsers(userIds, title, message, absoluteUrl),
  ]);

  if (push.status === "rejected") console.error("OneSignal push failed:", push.reason);
  if (email.status === "rejected") console.error("SMTP email failed:", email.reason);
}
