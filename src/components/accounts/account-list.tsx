import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { ask } from "@tauri-apps/plugin-dialog";
import { Reorder } from "framer-motion";
import { Check, Copy, GripVertical, Pencil, Trash2 } from "lucide-react";

import { toastSuccess } from "@kumix/ui/custom/toast";
import {
  type SwipeableListItem as SLItem,
  type SwipeAction,
  SwipeableList,
} from "@kumix/ui/motion/swipeable-list";
import { Button } from "@kumix/ui/ui/button";
import { CountdownRing } from "@/components/shared/countdown-ring";
import { useStore } from "@/stores/app-store";

function formatCode(code: string): string {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
  if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`;
  return code;
}

function issuerInitial(issuer: string): string {
  return issuer.charAt(0).toUpperCase();
}

const LONG_PRESS_MS = 500;

export function AccountList() {
  const accounts = useStore((s) => s.accounts);
  const searchQuery = useStore((s) => s.searchQuery);
  const setEditingAccount = useStore((s) => s.setEditingAccount);
  const deleteAccount = useStore((s) => s.deleteAccount);
  const reorderAccounts = useStore((s) => s.reorderAccounts);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [reorderIds, setReorderIds] = useState<string[]>([]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const handleCopy = useCallback(async (id: string, code: string) => {
    try {
      await writeText(code);
    } catch {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedId(id);
    toastSuccess({ message: "Code copied!" });
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 1500);

    // Auto-clear clipboard
    const autoClearSec = useStore.getState().settings.clipboardAutoClear;
    if (autoClearSec > 0) {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(async () => {
        try {
          const current = await readText();
          if (current === code) {
            await writeText("");
          }
        } catch {
          // ignore
        }
      }, autoClearSec * 1000);
    }
  }, []);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts;
    const q = searchQuery.toLowerCase();
    return accounts.filter(
      (a) => a.issuer.toLowerCase().includes(q) || a.account.toLowerCase().includes(q),
    );
  }, [accounts, searchQuery]);

  // Enter reorder mode
  const enterReorder = useCallback(() => {
    if (searchQuery) return; // no reorder while filtering
    setReorderIds(accounts.map((a) => a.id));
    setReordering(true);
  }, [accounts, searchQuery]);

  // Save reorder
  const saveReorder = useCallback(async () => {
    await reorderAccounts(reorderIds);
    setReordering(false);
    toastSuccess({ message: "Order saved" });
  }, [reorderIds, reorderAccounts]);

  // Cancel on Escape
  useEffect(() => {
    if (!reordering) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReordering(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [reordering]);

  // Long press handlers — cancel if pointer moves (scroll/drag)
  const MOVE_THRESHOLD = 10;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      pointerStart.current = { x: e.clientX, y: e.clientY };
      longPressTimer.current = setTimeout(enterReorder, LONG_PRESS_MS);
    },
    [enterReorder],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerStart.current || !longPressTimer.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  }, []);

  const onPointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = undefined;
    pointerStart.current = null;
  }, []);

  // Cleanup auto-clear timer on unmount
  useEffect(() => {
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

  // Swipe actions
  const handleAction = useCallback(
    async (payload: { item: SLItem; action: { id: string }; side: string }) => {
      const account = filteredAccounts.find((a) => a.id === payload.item.id);
      if (!account) return;

      switch (payload.action.id) {
        case "copy":
          await handleCopy(account.id, account.code);
          break;
        case "edit":
          setEditingAccount(account);
          break;
        case "delete": {
          const yes = await ask(`Delete ${account.issuer} - ${account.account}?`, {
            title: "Delete Account",
            kind: "warning",
          });
          if (yes) {
            await deleteAccount(account.id);
            toastSuccess({ message: "Account deleted" });
          }
          break;
        }
      }
    },
    [filteredAccounts, setEditingAccount, deleteAccount, handleCopy],
  );

  const leftActions: SwipeAction[] = [
    { id: "copy", label: "Copy", icon: <Copy className="size-4" />, tone: "success" },
  ];

  const rightActions: SwipeAction[] = [
    { id: "edit", label: "Edit", icon: <Pencil className="size-4" />, tone: "primary" },
    { id: "delete", label: "Delete", icon: <Trash2 className="size-4" />, tone: "danger" },
  ];

  if (accounts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Copy className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mt-3 font-semibold text-sm">No accounts yet</h3>
        <p className="mt-1 text-muted-foreground text-xs">
          Add your first 2FA account using the + button above.
        </p>
      </div>
    );
  }

  if (filteredAccounts.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground text-sm">
        No accounts matching &ldquo;{searchQuery}&rdquo;
      </div>
    );
  }

  // Reorder mode
  if (reordering) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-border border-b bg-accent/50 px-4 py-2">
          <span className="font-medium text-muted-foreground text-xs">
            Drag to reorder • Esc to cancel
          </span>
          <div className="flex gap-1.5">
            <Button size="xs" variant="ghost" onClick={() => setReordering(false)}>
              Cancel
            </Button>
            <Button size="xs" onClick={saveReorder}>
              Done
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <Reorder.Group
            axis="y"
            values={reorderIds}
            onReorder={setReorderIds}
            className="space-y-2"
          >
            {reorderIds.map((id) => {
              const a = accounts.find((acc) => acc.id === id);
              if (!a) return null;
              return (
                <Reorder.Item
                  key={id}
                  value={id}
                  className="flex cursor-grab items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm active:cursor-grabbing active:shadow-md"
                >
                  <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                    {issuerInitial(a.issuer)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{a.issuer}</p>
                    <p className="truncate text-muted-foreground text-xs">{a.account}</p>
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>
      </div>
    );
  }

  // Normal swipeable list
  const items: SLItem[] = filteredAccounts.map((a) => {
    const isCopied = copiedId === a.id;
    return {
      id: a.id,
      content: (
        <div
          className="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-3"
          onClick={() => handleCopy(a.id, a.code)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleCopy(a.id, a.code);
          }}
          role="button"
          tabIndex={0}
        >
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-full font-bold text-sm transition-colors ${
              isCopied
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-primary/10 text-primary"
            }`}
          >
            {isCopied ? <Check className="size-4" /> : issuerInitial(a.issuer)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground text-sm">{a.issuer}</p>
            <p className="truncate text-muted-foreground text-xs">{a.account}</p>
          </div>
          <div
            className="flex shrink-0 items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <button
              type="button"
              className={`cursor-pointer font-bold font-mono text-base tabular-nums tracking-wider transition-colors ${
                isCopied ? "text-emerald-600 dark:text-emerald-400" : "hover:text-primary"
              }`}
              onClick={() => handleCopy(a.id, a.code)}
            >
              {isCopied ? (
                <span className="flex items-center gap-1">
                  <Check className="size-3.5" />
                  Copied
                </span>
              ) : (
                formatCode(a.code)
              )}
            </button>
            <CountdownRing secondsRemaining={a.seconds_remaining} period={a.period} size={20} />
          </div>
        </div>
      ),
      leftActions,
      rightActions,
    };
  });

  return (
    <div
      className="flex-1 overflow-y-auto px-3 py-2"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <SwipeableList
        items={items}
        onAction={handleAction}
        closeOnAction
        classNames={{ surface: "!cursor-default bg-card shadow-sm dark:shadow-none" }}
      />
    </div>
  );
}
