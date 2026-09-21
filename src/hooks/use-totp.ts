import { useEffect, useRef } from "react";

import { useStore } from "@/stores/app-store";

/**
 * Poll TOTP codes every second.
 * ponytail: 1s IPC is fine for <100 accounts (local Rust, ~0.1ms).
 * If 500+ accounts, switch to client-side countdown with IPC only at period boundary.
 */
export function useTotp() {
  const refreshCodes = useStore((s) => s.refreshCodes);
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    refreshCodes();

    intervalRef.current = setInterval(() => {
      refreshCodes();
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeWorkspaceId, refreshCodes]);
}
