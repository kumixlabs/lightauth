import { type FormEvent, useState } from "react";

import { toastSuccess } from "@kumix/ui/custom/toast";
import { Button } from "@kumix/ui/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kumix/ui/ui/dialog";
import { Label } from "@kumix/ui/ui/label";
import { Textarea } from "@kumix/ui/ui/textarea";
import { useStore } from "@/stores/app-store";

interface ImportUriDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportUriDialog({ open, onOpenChange }: ImportUriDialogProps) {
  const importUri = useStore((s) => s.importUri);
  const [uris, setUris] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const lines = uris
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("otpauth://"));

    if (lines.length === 0) {
      setError("Paste at least one otpauth:// URI");
      return;
    }

    setLoading(true);
    setError("");
    let imported = 0;
    const errors: string[] = [];

    for (const uri of lines) {
      try {
        await importUri(uri);
        imported++;
      } catch (err) {
        errors.push(`${uri.slice(0, 40)}...: ${err}`);
      }
    }

    setLoading(false);

    if (imported > 0) {
      toastSuccess({ message: `Imported ${imported} account(s)` });
      onOpenChange(false);
      setUris("");
    }
    if (errors.length > 0) {
      setError(errors.join("\n"));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setUris("");
          setError("");
        }
      }}
    >
      <DialogContent className="max-w-105">
        <DialogHeader>
          <DialogTitle>Import from URI</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>otpauth:// URIs (one per line)</Label>
            <Textarea
              placeholder="otpauth://totp/GitHub:user?secret=JBSWY3DPEHPK3PXP&issuer=GitHub"
              value={uris}
              onChange={(e) => setUris(e.target.value)}
              rows={5}
              className="wrap-anywhere break-all font-mono text-xs"
              autoFocus
            />
          </div>
          {error && <p className="whitespace-pre-wrap text-destructive text-xs">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
