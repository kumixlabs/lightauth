import { describe, expect, it } from "bun:test";

// Mock localStorage before store import
const storage: Record<string, string> = {};
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      for (const key of Object.keys(storage)) delete storage[key];
    },
    key: () => null,
    length: 0,
  },
  writable: true,
});

const { useStore } = await import("./app-store");

describe("app-store", () => {
  it("has correct initial state", () => {
    const state = useStore.getState();
    expect(state.workspaces).toEqual([]);
    expect(state.accounts).toEqual([]);
    expect(state.searchQuery).toBe("");
    expect(state.settings.theme).toBe("system");
    expect(state.settings.clipboardAutoClear).toBe(30);
    expect(state.settings.minimizeToTray).toBe(true);
  });

  it("updates search query", () => {
    useStore.getState().setSearchQuery("github");
    expect(useStore.getState().searchQuery).toBe("github");
    useStore.getState().setSearchQuery("");
  });

  it("updates settings partially", () => {
    useStore.getState().updateSettings({ clipboardAutoClear: 15 });
    expect(useStore.getState().settings.clipboardAutoClear).toBe(15);
    expect(useStore.getState().settings.minimizeToTray).toBe(true);
    // revert
    useStore.getState().updateSettings({ clipboardAutoClear: 30 });
  });

  it("toggles dialogs", () => {
    useStore.getState().setSettingsOpen(true);
    expect(useStore.getState().settingsOpen).toBe(true);
    useStore.getState().setSettingsOpen(false);

    useStore.getState().setAddAccountOpen(true);
    expect(useStore.getState().addAccountOpen).toBe(true);
    useStore.getState().setAddAccountOpen(false);

    useStore.getState().setImportUriOpen(true);
    expect(useStore.getState().importUriOpen).toBe(true);
    useStore.getState().setImportUriOpen(false);
  });
});
