const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

interface SendPushParams {
  userIds: string[];
  heading: string;
  content: string;
  url?: string;
}

export async function sendOneSignalPush({ userIds, heading, content, url }: SendPushParams) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) {
    console.warn("OneSignal env vars not set, skipping push notification");
    return;
  }

  const res = await fetch(ONESIGNAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      target_channel: "push",
      include_aliases: { external_id: userIds },
      headings: { en: heading },
      contents: { en: content },
      url,
    }),
  });

  if (!res.ok) {
    throw new Error(`OneSignal push gagal (${res.status}): ${await res.text()}`);
  }
}
