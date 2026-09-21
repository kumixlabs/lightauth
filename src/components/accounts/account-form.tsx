import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@kumix/ui/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kumix/ui/ui/dialog";
import { Input } from "@kumix/ui/ui/input";
import { Label } from "@kumix/ui/ui/label";
import { useStore } from "@/stores/app-store";
import type { AccountWithCode } from "@/types";

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountWithCode | null;
}

export function AccountForm({ open, onOpenChange, account }: AccountFormProps) {
  const createAccount = useStore((s) => s.createAccount);
  const updateAccount = useStore((s) => s.updateAccount);

  const [issuer, setIssuer] = useState("");
  const [accountName, setAccountName] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!account;

  useEffect(() => {
    if (open) {
      if (account) {
        setIssuer(account.issuer);
        setAccountName(account.account);
        setSecret(account.secret);
      } else {
        setIssuer("");
        setAccountName("");
        setSecret("");
      }
      setError("");
    }
  }, [open, account]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanSecret = secret.replace(/\s+/g, "").toUpperCase();
    if (!issuer.trim() || !cleanSecret) {
      setError("Issuer and secret are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (isEditing && account) {
        await updateAccount(account.id, {
          issuer: issuer.trim(),
          account: accountName.trim(),
          secret: cleanSecret,
        });
      } else {
        await createAccount({
          issuer: issuer.trim(),
          account: accountName.trim(),
          secret: cleanSecret,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-105">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Account" : "Add Account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="issuer">Issuer *</Label>
            <Input
              id="issuer"
              placeholder="Google, GitHub, AWS..."
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-name">Account</Label>
            <Input
              id="account-name"
              placeholder="user@example.com"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secret">Secret (Base32) *</Label>
            <Input
              id="secret"
              placeholder="JBSWY3DPEHPK3PXP"
              value={secret}
              onChange={(e) => setSecret(e.target.value.replace(/\s+/g, "").toUpperCase())}
              className="font-mono text-sm"
              disabled={isEditing}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
