export type Theme = "light" | "dark" | "system";

export interface Workspace {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  account_count?: number;
}

export interface Account {
  id: string;
  workspace_id: string;
  issuer: string;
  account: string;
  secret: string;
  algorithm: "SHA1" | "SHA256" | "SHA512";
  digits: 6 | 8;
  period: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AccountWithCode extends Account {
  code: string;
  seconds_remaining: number;
}

export interface AccountInput {
  issuer: string;
  account: string;
  secret: string;
  algorithm: string;
  digits: number;
  period: number;
}

export interface AccountPatch {
  issuer?: string;
  account?: string;
  secret?: string;
  algorithm?: string;
  digits?: number;
  period?: number;
}

export interface AppSettings {
  theme: Theme;
  clipboardAutoClear: number; // seconds, 0 = off
  startMinimized: boolean;
  minimizeToTray: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: number;
}
