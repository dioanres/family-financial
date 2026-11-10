import { prisma } from "@/lib/prisma";
import { sendOneSignalPush } from "@/lib/onesignal";

interface SendNotificationParams {
  userIds: string[];
  title: string;
  message: string;
  url?: string;
}

export async function sendNotification({ userIds, title, message, url }: SendNotificationParams) {
  if (userIds.length === 0) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, title, message, url })),
  });

  try {
    await sendOneSignalPush({ userIds, heading: title, content: message, url });
  } catch (error) {
    console.error("OneSignal push failed:", error);
  }
}
