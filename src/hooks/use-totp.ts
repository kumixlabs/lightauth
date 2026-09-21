import { useEffect, useRef } from "react";

import { useStore } from "@/stores/app-store";

/** Poll TOTP codes every second to update countdown + refresh codes at period boundary. */
export function useTotp() {
  const refreshCodes = useStore((s) => s.refreshCodes);
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    // Initial load
    refreshCodes();

    intervalRef.current = setInterval(() => {
      refreshCodes();
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeWorkspaceId, refreshCodes]);
}
