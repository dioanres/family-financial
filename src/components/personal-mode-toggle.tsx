"use client";

import { cn } from "@/lib/utils";
import { usePersonalMode } from "@/lib/personal-mode-context";

export function PersonalModeToggle() {
  const { isPersonal, setIsPersonal } = usePersonalMode();

  return (
    <div className="flex items-center rounded-lg bg-accent p-0.5 text-xs font-medium">
      <button
        type="button"
        onClick={() => setIsPersonal(false)}
        className={cn(
          "rounded-md px-2.5 py-1 transition-colors",
          !isPersonal
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Keluarga
      </button>
      <button
        type="button"
        onClick={() => setIsPersonal(true)}
        className={cn(
          "rounded-md px-2.5 py-1 transition-colors",
          isPersonal
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Personal
      </button>
    </div>
  );
}
