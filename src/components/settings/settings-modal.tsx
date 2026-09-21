import { useState } from "react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { CheckCircle2, Download, Loader2, Pencil, RefreshCw, Sparkles, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@kumix/ui/custom/confirm-dialog";
import { toastError, toastSuccess } from "@kumix/ui/custom/toast";
import { Button } from "@kumix/ui/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@kumix/ui/ui/dialog";
import { Input } from "@kumix/ui/ui/input";
import { Label } from "@kumix/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kumix/ui/ui/select";
import { Separator } from "@kumix/ui/ui/separator";
import { Switch } from "@kumix/ui/ui/switch";
import { useStore } from "@/stores/app-store";
import type { Theme, Workspace } from "@/types";

const THEME_LABELS: Record<string, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function SettingsModal() {
  const open = useStore((s) => s.settingsOpen);
  const setOpen = useStore((s) => s.setSettingsOpen);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const workspaces = useStore((s) => s.workspaces);
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId);
  const updateWorkspace = useStore((s) => s.updateWorkspace);
  const deleteWorkspace = useStore((s) => s.deleteWorkspace);
  const exportVault = useStore((s) => s.exportVault);
  const importVault = useStore((s) => s.importVault);
  const exportWorkspace = useStore((s) => s.exportWorkspace);
  const importWorkspace = useStore((s) => s.importWorkspace);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const [editingWs, setEditingWs] = useState<Workspace | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [editName, setEditName] = useState("");

  const handleSaveEdit = async () => {
    if (!editingWs || !editName.trim()) {
      setEditingWs(null);
      return;
    }
    if (editName.trim() === editingWs.name) {
      setEditingWs(null);
      return;
    }
    await updateWorkspace(editingWs.id, editName.trim());
    setEditingWs(null);
    toastSuccess({ message: "Workspace updated" });
  };

  const handleDeleteWorkspace = (ws: Workspace) => {
    if (workspaces.length <= 1) {
      toastError({ message: "Cannot delete the last workspace" });
      return;
    }
    setWorkspaceToDelete(ws);
  };

  const handleExportVault = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const path = await saveDialog({
      defaultPath: `lightauth-vault-${today}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return;
    await exportVault(path);
    toastSuccess({ message: "Full vault exported" });
  };

  const handleImportVault = async () => {
    const path = await openDialog({
      filters: [{ name: "JSON", extensions: ["json"] }],
      multiple: false,
    });
    if (!path) return;
    try {
      const result = await importVault(path as string);
      toastSuccess({ message: `Imported ${result.imported}, skipped ${result.skipped}` });
    } catch (err) {
      toastError({ message: `Vault import failed: ${err}` });
    }
  };

  const handleExportWorkspace = async () => {
    if (!activeWorkspace) return;
    const today = new Date().toISOString().slice(0, 10);
    const slug = activeWorkspace.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
    const path = await saveDialog({
      defaultPath: `lightauth-${slug}-${today}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return;
    await exportWorkspace(activeWorkspace.id, path);
    toastSuccess({ message: `Workspace "${activeWorkspace.name}" exported` });
  };

  const handleImportWorkspace = async () => {
    if (!activeWorkspace) return;
    const path = await openDialog({
      filters: [{ name: "JSON", extensions: ["json"] }],
      multiple: false,
    });
    if (!path) return;
    try {
      const result = await importWorkspace(activeWorkspace.id, path as string);
      toastSuccess({ message: `Imported ${result.imported}, skipped ${result.skipped}` });
    } catch (err) {
      toastError({ message: `Workspace import failed: ${err}` });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-105 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Workspaces */}
            <section className="space-y-2">
              <h3 className="font-semibold text-sm">Workspaces</h3>
              <div className="space-y-1">
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    {editingWs?.id === ws.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveEdit();
                        }}
                        className="flex flex-1 items-center gap-1"
                      >
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          onBlur={handleSaveEdit}
                        />
                      </form>
                    ) : (
                      <>
                        <span className="flex-1 truncate">{ws.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => {
                            setEditingWs(ws);
                            setEditName(ws.name);
                          }}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        {workspaces.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-destructive"
                            onClick={() => handleDeleteWorkspace(ws)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* Theme */}
            <section className="space-y-2">
              <h3 className="font-semibold text-sm">Appearance</h3>
              <div className="flex items-center justify-between">
                <Label>Theme</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(v) => v && updateSettings({ theme: v as Theme })}
                >
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue>{(val) => THEME_LABELS[val as string] ?? val}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            <Separator />

            {/* Backup */}
            <section className="space-y-3">
              <h3 className="font-semibold text-sm">Backup</h3>
              {activeWorkspace && (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs">
                    Workspace:{" "}
                    <span className="font-medium text-foreground">{activeWorkspace.name}</span>
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleExportWorkspace}
                    >
                      Export Accounts
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleImportWorkspace}
                    >
                      Import Accounts
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs">Full Vault (All Workspaces)</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleExportVault}
                  >
                    Export Full Vault
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleImportVault}
                  >
                    Import Full Vault
                  </Button>
                </div>
              </div>
            </section>

            <Separator />

            {/* Behavior */}
            <section className="space-y-3">
              <h3 className="font-semibold text-sm">Behavior</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Close to tray</p>
                  <p className="text-muted-foreground text-xs">
                    Minimize to system tray instead of quitting
                  </p>
                </div>
                <Switch
                  checked={settings.minimizeToTray}
                  onCheckedChange={(v) => updateSettings({ minimizeToTray: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Auto-clear clipboard</p>
                  <p className="text-muted-foreground text-xs">Clear copied code after delay</p>
                </div>
                <Select
                  value={String(settings.clipboardAutoClear)}
                  onValueChange={(v) => v && updateSettings({ clipboardAutoClear: Number(v) })}
                >
                  <SelectTrigger className="h-8 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Off</SelectItem>
                    <SelectItem value="15">15s</SelectItem>
                    <SelectItem value="30">30s</SelectItem>
                    <SelectItem value="60">60s</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>
            <section className="space-y-2">
              <h3 className="font-semibold text-sm">Application & Updates</h3>
              <UpdateCheckerRow />
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!workspaceToDelete}
        onOpenChange={(v) => !v && setWorkspaceToDelete(null)}
        title="Delete Workspace"
        description={`Delete workspace "${workspaceToDelete?.name}" and all its accounts? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={async () => {
          if (workspaceToDelete) {
            await deleteWorkspace(workspaceToDelete.id);
            toastSuccess({ message: "Workspace deleted" });
            setWorkspaceToDelete(null);
          }
        }}
      />
    </>
  );
}

function UpdateCheckerRow() {
  const [status, setStatus] = useState<
    "idle" | "checking" | "latest" | "available" | "downloading" | "error"
  >("idle");
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updateHandle, setUpdateHandle] = useState<Awaited<ReturnType<typeof check>> | null>(null);

  const handleCheckUpdate = async () => {
    setStatus("checking");
    setErrorMessage(null);
    try {
      const update = await check();
      if (update?.available) {
        setNewVersion(update.version);
        setUpdateHandle(update);
        setStatus("available");
      } else {
        setStatus("latest");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to check for updates");
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateHandle) return;
    setStatus("downloading");
    try {
      await updateHandle.downloadAndInstall();
      await relaunch();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to download update");
    }
  };

  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted/60">
            <Sparkles className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">LightAuth v{__APP_VERSION__}</p>
            <p className="text-muted-foreground text-xs">
              {status === "checking" && "Checking for new releases..."}
              {status === "latest" && "You're on the latest version"}
              {status === "available" && `Update available: v${newVersion}`}
              {status === "downloading" && "Downloading & installing update..."}
              {status === "error" && (errorMessage || "Update check failed")}
              {status === "idle" && "Check GitHub Releases for updates"}
            </p>
          </div>
        </div>
        <div>
          {status === "available" ? (
            <Button size="sm" onClick={handleInstallUpdate} className="gap-1.5">
              <Download className="size-3.5" />
              Update to v{newVersion}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={status === "checking" || status === "downloading"}
              onClick={handleCheckUpdate}
              className="gap-1.5"
            >
              {status === "checking" || status === "downloading" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : status === "latest" ? (
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {status === "checking"
                ? "Checking..."
                : status === "downloading"
                  ? "Updating..."
                  : status === "latest"
                    ? "Up to date"
                    : "Check updates"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
