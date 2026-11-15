"use client";

import { usePersonalMode } from "@/lib/personal-mode-context";

export function FamilyOnly({ children }: { children: React.ReactNode }) {
  const { isPersonal } = usePersonalMode();
  return isPersonal ? null : <>{children}</>;
}
