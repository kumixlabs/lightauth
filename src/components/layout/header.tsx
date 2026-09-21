import { type FormEvent, useState } from "react";
import { ChevronDown, Plus, Settings } from "lucide-react";

import { toastSuccess } from "@kumix/ui/custom/toast";
import { Button } from "@kumix/ui/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kumix/ui/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kumix/ui/ui/dropdown-menu";
import { Input } from "@kumix/ui/ui/input";
import { Label } from "@kumix/ui/ui/label";
import { useStore } from "@/stores/app-store";

export function Header() {
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const workspaces = useStore((s) => s.workspaces);
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useStore((s) => s.setActiveWorkspace);
  const createWorkspace = useStore((s) => s.createWorkspace);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const name = workspaceName.trim();
    if (!name) return;

    setLoading(true);
    try {
      const ws = await createWorkspace(name);
      await setActiveWorkspace(ws.id);
      setWorkspaceName("");
      setDialogOpen(false);
      toastSuccess({ message: "Workspace created" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between border-border border-b bg-background/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/favicon.png" alt="LightAuth" className="size-5" />
          <h1 className="font-semibold text-sm">LightAuth</h1>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex min-w-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-accent hover:text-foreground">
              <span className="truncate">{activeWorkspace?.name ?? "—"}</span>
              <ChevronDown className="size-3 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => setActiveWorkspace(ws.id)}
                  className={`flex items-center justify-between ${ws.id === activeWorkspaceId ? "bg-accent" : ""}`}
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.account_count !== undefined && (
                    <span className="ml-2 font-mono text-muted-foreground text-xs">
                      {ws.account_count}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 size-3.5" />
                New Workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="size-4" />
        </Button>
      </header>

      {/* New Workspace Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setWorkspaceName("");
        }}
      >
        <DialogContent className="max-w-90">
          <DialogHeader>
            <DialogTitle>New Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input
                id="ws-name"
                placeholder="Work, Personal, Crypto..."
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!workspaceName.trim() || loading}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
