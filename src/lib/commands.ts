import { invoke } from "@tauri-apps/api/core";

import type {
  Account,
  AccountInput,
  AccountPatch,
  AccountWithCode,
  ImportResult,
  Workspace,
} from "@/types";

// Vault
export const vaultExists = () => invoke<boolean>("vault_exists");
export const vaultInit = () => invoke<void>("vault_init");
export const vaultExport = (path: string) => invoke<void>("vault_export", { path });
export const vaultImport = (path: string) => invoke<ImportResult>("vault_import", { path });

// Workspaces
export const workspaceList = () => invoke<Workspace[]>("workspace_list");
export const workspaceCreate = (name: string) => invoke<Workspace>("workspace_create", { name });
export const workspaceUpdate = (id: string, name: string) =>
  invoke<Workspace>("workspace_update", { id, name });
export const workspaceDelete = (id: string) => invoke<void>("workspace_delete", { id });
export const workspaceReorder = (ids: string[]) =>
  invoke<Workspace[]>("workspace_reorder", { ids });

// Accounts
export const accountList = (workspaceId: string) =>
  invoke<AccountWithCode[]>("account_list", { workspaceId });
export const accountCreate = (workspaceId: string, input: AccountInput) =>
  invoke<Account>("account_create", { workspaceId, input });
export const accountUpdate = (id: string, patch: AccountPatch) =>
  invoke<Account>("account_update", { id, patch });
export const accountDelete = (id: string) => invoke<void>("account_delete", { id });
export const accountReorder = (ids: string[]) => invoke<Account[]>("account_reorder", { ids });
export const accountImportUri = (workspaceId: string, uri: string) =>
  invoke<Account>("account_import_uri", { workspaceId, uri });
export const accountImportQr = (workspaceId: string, path: string) =>
  invoke<Account>("account_import_qr", { workspaceId, path });
export const accountMove = (id: string, workspaceId: string) =>
  invoke<Account>("account_move", { id, workspaceId });
