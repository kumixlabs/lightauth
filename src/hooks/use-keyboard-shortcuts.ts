import { useEffect } from "react";

import { useStore } from "@/stores/app-store";

export function useKeyboardShortcuts() {
  const setAddAccountOpen = useStore((s) => s.setAddAccountOpen);
  const setImportUriOpen = useStore((s) => s.setImportUriOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const workspaces = useStore((s) => s.workspaces);
  const setActiveWorkspace = useStore((s) => s.setActiveWorkspace);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      switch (e.key) {
        case "n":
          e.preventDefault();
          setAddAccountOpen(true);
          break;
        case "i":
          e.preventDefault();
          setImportUriOpen(true);
          break;
        case ",":
          e.preventDefault();
          setSettingsOpen(true);
          break;
        case "k":
        case "f":
          e.preventDefault();
          document.getElementById("search-input")?.focus();
          break;
        default:
          // Ctrl+1..9 → switch workspace
          if (e.key >= "1" && e.key <= "9") {
            const idx = Number.parseInt(e.key) - 1;
            if (workspaces[idx]) {
              e.preventDefault();
              setActiveWorkspace(workspaces[idx].id);
            }
          }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [workspaces, setActiveWorkspace, setAddAccountOpen, setImportUriOpen, setSettingsOpen]);
}
