import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { exit } from "@tauri-apps/plugin-process";
import { ImagePlus, Link, Loader2, Plus } from "lucide-react";

import { ToastContainer, toastError, toastSuccess } from "@kumix/ui/custom/toast";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@kumix/ui/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@kumix/ui/ui/dropdown-menu";
import { AccountForm } from "@/components/accounts/account-form";
import { AccountList } from "@/components/accounts/account-list";
import { ImportUriDialog } from "@/components/accounts/import-uri";
import { Header } from "@/components/layout/header";
import { SettingsModal } from "@/components/settings/settings-modal";
import { SearchBar } from "@/components/shared/search-bar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useTheme } from "@/hooks/use-theme";
import { useTotp } from "@/hooks/use-totp";
import { useStore } from "@/stores/app-store";

export default function App() {
  useTheme();
  useTotp();
  useKeyboardShortcuts();

  const loadWorkspaces = useStore((s) => s.loadWorkspaces);
  const addAccountOpen = useStore((s) => s.addAccountOpen);
  const setAddAccountOpen = useStore((s) => s.setAddAccountOpen);
  const importUriOpen = useStore((s) => s.importUriOpen);
  const setImportUriOpen = useStore((s) => s.setImportUriOpen);
  const editingAccount = useStore((s) => s.editingAccount);
  const setEditingAccount = useStore((s) => s.setEditingAccount);
  const importQr = useStore((s) => s.importQr);
  const [importing, setImporting] = useState(false);

  // Close / Tray behavior
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    getCurrentWindow()
      .onCloseRequested(async (event) => {
        event.preventDefault();
        if (useStore.getState().settings.minimizeToTray) {
          try {
            await getCurrentWindow().hide();
          } catch (err) {
            console.error("Failed to hide to tray:", err);
          }
        } else {
          await exit(0);
        }
      })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleImportQr = async () => {
    const path = await openDialog({
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "bmp", "webp"] }],
      multiple: false,
    });
    if (!path) return;
    setImporting(true);
    try {
      const result = await importQr(path as string);
      toastSuccess({
        message: `Imported ${result.imported} account(s), skipped ${result.skipped}`,
      });
    } catch (err) {
      toastError({ message: `QR import failed: ${err}` });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-background text-foreground flex h-screen flex-col select-none">
      <Header />
      <SearchBar />
      <AccountList />

      {/* Bottom action bar */}
      <div className="border-border border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium">
            <Plus className="size-4" />
            Add Account
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-114 max-w-[calc(100vw-1.5rem)]">
            <DropdownMenuItem onClick={() => setAddAccountOpen(true)}>
              <Plus className="mr-2 size-4" />
              Manual Entry
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setImportUriOpen(true)}>
              <Link className="mr-2 size-4" />
              Import URI
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImportQr}>
              <ImagePlus className="mr-2 size-4" />
              Import QR Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialogs */}
      <AccountForm open={addAccountOpen} onOpenChange={setAddAccountOpen} />
      <AccountForm
        open={!!editingAccount}
        onOpenChange={(v) => !v && setEditingAccount(null)}
        account={editingAccount}
      />
      <ImportUriDialog open={importUriOpen} onOpenChange={setImportUriOpen} />
      <SettingsModal />

      {/* Import progress dialog */}
      <Dialog open={importing} onOpenChange={() => {}}>
        <DialogContent className="max-w-56 sm:max-w-56" showCloseButton={false}>
          <div className="flex flex-col items-center gap-3 py-2">
            <Loader2 className="text-primary size-8 animate-spin" />
            <DialogTitle className="text-center text-sm font-medium">Importing...</DialogTitle>
            <DialogDescription className="text-muted-foreground text-center text-xs">
              Decoding QR and importing accounts
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>

      <ToastContainer />
    </div>
  );
}
