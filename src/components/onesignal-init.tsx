"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

declare global {
  interface Window {
    OneSignalDeferred?: any[];
  }
}

export function OneSignalInit() {
  const { data: session } = useSession();

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId || !session?.user) return;

    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    document.head.appendChild(script);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.init({ appId });
      if (session.user.id) {
        await OneSignal.login(session.user.id);
      }
      if (session.user.email) {
        await OneSignal.User.addEmail(session.user.email);
      }
    });
  }, [session]);

  return null;
}
