import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  accountCreate,
  accountDelete,
  accountImportQr,
  accountImportUri,
  accountList,
  accountMove,
  accountReorder,
  accountUpdate,
  vaultExport,
  vaultImport,
  workspaceCreate,
  workspaceDelete,
  workspaceList,
  workspaceUpdate,
} from "@/lib/commands";
import type {
  AccountInput,
  AccountPatch,
  AccountWithCode,
  AppSettings,
  ImportResult,
  Workspace,
} from "@/types";

interface AppState {
  // Data
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  accounts: AccountWithCode[];
  searchQuery: string;

  // Settings
  settings: AppSettings;

  // UI
  settingsOpen: boolean;
  addAccountOpen: boolean;
  importUriOpen: boolean;
  editingAccount: AccountWithCode | null;

  // Actions
  loadWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string) => Promise<void>;
  loadAccounts: () => Promise<void>;
  refreshCodes: () => Promise<void>;
  setSearchQuery: (q: string) => void;

  // Workspace CRUD
  createWorkspace: (name: string) => Promise<Workspace>;
  updateWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;

  // Account CRUD
  createAccount: (input: AccountInput) => Promise<void>;
  updateAccount: (id: string, patch: AccountPatch) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reorderAccounts: (ids: string[]) => Promise<void>;
  importUri: (uri: string) => Promise<void>;
  importQr: (path: string) => Promise<void>;
  moveAccount: (id: string, workspaceId: string) => Promise<void>;

  // Vault
  exportVault: (path: string) => Promise<void>;
  importVault: (path: string) => Promise<ImportResult>;

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void;
  setSettingsOpen: (open: boolean) => void;
  setAddAccountOpen: (open: boolean) => void;
  setImportUriOpen: (open: boolean) => void;
  setEditingAccount: (account: AccountWithCode | null) => void;
}

const defaultSettings: AppSettings = {
  theme: "system",
  clipboardAutoClear: 30,
  startMinimized: false,
  minimizeToTray: true,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,
      accounts: [],
      searchQuery: "",
      settings: defaultSettings,
      settingsOpen: false,
      addAccountOpen: false,
      importUriOpen: false,
      editingAccount: null,

      loadWorkspaces: async () => {
        const workspaces = await workspaceList();
        set({ workspaces });
        const state = get();
        // Auto-select first workspace if none selected or current doesn't exist
        if (!state.activeWorkspaceId || !workspaces.find((w) => w.id === state.activeWorkspaceId)) {
          if (workspaces.length > 0) {
            await get().setActiveWorkspace(workspaces[0].id);
          }
        }
      },

      setActiveWorkspace: async (id) => {
        set({ activeWorkspaceId: id, searchQuery: "" });
        await get().loadAccounts();
      },

      loadAccounts: async () => {
        const { activeWorkspaceId } = get();
        if (!activeWorkspaceId) return;
        const accounts = await accountList(activeWorkspaceId);
        set({ accounts });
      },

      refreshCodes: async () => {
        const { activeWorkspaceId } = get();
        if (!activeWorkspaceId) return;
        const accounts = await accountList(activeWorkspaceId);
        set({ accounts });
      },

      setSearchQuery: (q) => set({ searchQuery: q }),

      createWorkspace: async (name) => {
        const ws = await workspaceCreate(name);
        await get().loadWorkspaces();
        return ws;
      },

      updateWorkspace: async (id, name) => {
        await workspaceUpdate(id, name);
        await get().loadWorkspaces();
      },

      deleteWorkspace: async (id) => {
        await workspaceDelete(id);
        await get().loadWorkspaces();
      },

      createAccount: async (input) => {
        const { activeWorkspaceId } = get();
        if (!activeWorkspaceId) return;
        await accountCreate(activeWorkspaceId, input);
        await get().loadAccounts();
        await get().loadWorkspaces();
      },

      updateAccount: async (id, patch) => {
        await accountUpdate(id, patch);
        await get().loadAccounts();
      },

      deleteAccount: async (id) => {
        await accountDelete(id);
        await get().loadAccounts();
        await get().loadWorkspaces();
      },

      reorderAccounts: async (ids) => {
        await accountReorder(ids);
        await get().loadAccounts();
      },

      importUri: async (uri) => {
        const { activeWorkspaceId } = get();
        if (!activeWorkspaceId) return;
        await accountImportUri(activeWorkspaceId, uri);
        await get().loadAccounts();
        await get().loadWorkspaces();
      },

      importQr: async (path) => {
        const { activeWorkspaceId } = get();
        if (!activeWorkspaceId) return;
        await accountImportQr(activeWorkspaceId, path);
        await get().loadAccounts();
        await get().loadWorkspaces();
      },

      moveAccount: async (id, workspaceId) => {
        await accountMove(id, workspaceId);
        await get().loadAccounts();
        await get().loadWorkspaces();
      },

      exportVault: async (path) => {
        await vaultExport(path);
      },

      importVault: async (path) => {
        const result = await vaultImport(path);
        await get().loadWorkspaces();
        await get().loadAccounts();
        return result;
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setAddAccountOpen: (open) => set({ addAccountOpen: open }),
      setImportUriOpen: (open) => set({ importUriOpen: open }),
      setEditingAccount: (account) => set({ editingAccount: account }),
    }),
    {
      name: "lightauth-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
        settings: state.settings,
      }),
    },
  ),
);
