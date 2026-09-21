# LightAuth — Product Requirements Document (PRD)

**Product:** LightAuth\
**Tagline:** A lightweight desktop authenticator for secure two-factor authentication.\
**Status:** Planning\
**Platforms:** Windows, macOS, Linux\
**Primary Audience:** Developers, power users, and anyone who needs
TOTP authenticator codes on their desktop without reaching for a phone.

------------------------------------------------------------------------

# 1. Product Overview

## 1.1 Product Definition

LightAuth is a lightweight, fully offline desktop TOTP authenticator — think
**Google Authenticator, but on your laptop**:

- Generates time-based one-time passwords (TOTP) for any service.
- Organizes accounts into workspaces (e.g., "Personal", "Work", "Client X").
- Imports accounts via `otpauth://` URI, QR code image, or manual entry.
- Exports and imports vault backups for portability.

The core product philosophy is:

> **Open → See Codes → Copy → Done.**

LightAuth is **not** a password manager. There is no browser extension, no
form autofill, no password generation, no cloud sync, no master password.

### Google Authenticator (Mobile)

> Generate TOTP codes on your phone.

### Authy (Desktop + Mobile)

> Cloud-synced TOTP with account recovery.

### LightAuth

> Offline desktop TOTP authenticator with workspace organization.

------------------------------------------------------------------------

# 2. Problem Statement

Typical situations:

- SSH into a server and need a 2FA code — phone is across the room.
- Working in a VM or remote desktop — no phone camera for QR scan.
- Managing dozens of 2FA accounts across personal and client projects.
- Need a TOTP code during a deploy — fumbling with a phone breaks flow.
- Want a local-first authenticator that never phones home.

Using a phone authenticator is friction. Using Authy requires an account and
cloud sync. Using a password manager is heavy if you only need TOTP.

LightAuth reduces this to:

> **Open LightAuth → find account → click code → pasted.**

------------------------------------------------------------------------

# 3. Product Goals

## 3.1 Primary Goals

1. Generate standard TOTP codes (RFC 6238) with live countdown.
2. Support SHA1, SHA256, SHA512 algorithms; 6 or 8 digit codes; configurable period.
3. Organize accounts into workspaces.
4. Add accounts via manual entry, `otpauth://` URI paste, or QR code image import.
5. One-click copy code to clipboard.
6. Search and filter accounts.
7. Local file storage — secrets stored in a local data file, no master password required.
8. Export vault as backup file; import from backup file.
9. Work fully offline, local-first. Zero network calls.
10. Stay small, fast, simple.

## 3.2 Secondary Goals

1. Bulk import/export of accounts.
2. Drag-and-drop reordering of accounts.
3. Customizable appearance (theme).
4. System tray mode — minimize to tray, quick-access popup.
5. Keyboard shortcuts for common actions (search, copy, switch workspace).

------------------------------------------------------------------------

# 4. Non-Goals

Explicitly outside the scope:

- Password management of any kind.
- Browser extension or autofill.
- Cloud sync, cloud backup, remote accounts.
- Mobile companion app.
- HOTP (counter-based) support.
- Hardware key (FIDO2/WebAuthn) management.
- Biometric unlock (fingerprint, face).
- Multi-user / shared vaults.
- Push notification–based 2FA.

------------------------------------------------------------------------

# 5. Target Platform

## 5.1 Window Size

**Fixed compact width**: 480px default, min 400px, max 560px. Height: 720px
default, min 560px. The app is intentionally narrow — phone-like proportions
on desktop for quick glance-and-copy usage.

## 5.2 Initial Release (0.1.0)

**All three desktop platforms** — Windows, macOS, Linux. Built via
GitHub Actions matrix (NSIS + portable exe, DMG per-arch, AppImage + deb).

## 5.3 Future Releases

Platform-specific refinements as needed. No platform-specific complexity
unless required for cross-platform parity.

------------------------------------------------------------------------

# 6. Technology Stack

### Desktop Runtime

- Tauri 2.x
- Rust

### Frontend

- React
- TypeScript

### UI

- shadcn/ui-style components (@kumix/ui)
- Tailwind CSS

### Package Manager

- Bun

### TOTP Generation

- Rust-side TOTP implementation (RFC 6238) using `totp-rs` or equivalent crate.

### QR Code

- `image` + `rqrr` (Rust) for QR code decoding from image files.

Use latest stable versions at implementation time.

------------------------------------------------------------------------

# 7. Core Product Principles

## 7.1 Simple & Instant

No master password, no unlock screen. Open the app, codes are there.
Relies on OS-level user account protection for security.

## 7.2 Offline Only

No network calls. No telemetry. No analytics. No update phone-home
(updates are opt-in via GitHub releases or package manager). Secrets
never leave the machine.

## 7.3 Workspace-Centric

Accounts are organized into workspaces. Users can switch workspaces
via the settings modal. Each workspace is a logical grouping — the vault
is a single file containing all workspaces.

## 7.4 Fast First

Cold start to first code visible must be near-instant. No unlock step;
codes render immediately on launch.

## 7.5 Familiar UX

Compact single-column layout. Header → Search → List. Keyboard-first where
possible.

------------------------------------------------------------------------

# 8. Data Model

## 8.1 Vault

```
Vault (single JSON file on disk)
├── Workspace[]
│   ├── id: string (UUID)
│   ├── name: string
│   ├── icon: string (emoji or icon key)
│   ├── sortOrder: number
│   ├── createdAt: string (ISO 8601)
│   └── updatedAt: string (ISO 8601)
│
└── Account[]
    ├── id: string (UUID)
    ├── workspaceId: string (FK → Workspace)
    ├── issuer: string (e.g., "Google", "GitHub")
    ├── account: string (e.g., "user@example.com")
    ├── secret: string (Base32-encoded TOTP secret)
    ├── algorithm: "SHA1" | "SHA256" | "SHA512"
    ├── digits: 6 | 8
    ├── period: number (seconds, default 30)
    ├── sortOrder: number
    ├── createdAt: string (ISO 8601)
    └── updatedAt: string (ISO 8601)
```

## 8.2 Storage

- Single vault file: `~/.lightauth/vault.json` (or platform-appropriate app data directory).
- Vault file format: JSON.
- No encryption — instant access on app launch.
- Backup files: same JSON format, exported to user-chosen location.

------------------------------------------------------------------------

# 9. Main User Workflows

## 9.1 First Launch

1. User opens LightAuth for the first time.
2. Empty vault created automatically.
3. Default workspace "Personal" created automatically.
4. User lands on the main screen with an empty account list and a prompt to add their first account.

## 9.2 Add Account — Manual Entry

1. Click "Add Account" or press `Ctrl+N`.
2. Form: Issuer, Account name, Secret (Base32), Algorithm, Digits, Period, Workspace.
3. Issuer defaults to common providers with icons.
4. Save → account appears in the list, code generating immediately.

## 9.3 Add Account — URI Paste

1. Click "Import URI" or press `Ctrl+I`.
2. Paste one or more `otpauth://totp/...` URIs (one per line).
3. Parsed and validated → accounts created in current workspace.

## 9.4 Add Account — QR Code Image

1. Click "Import QR" or press `Ctrl+Q`.
2. File picker opens → select a QR code image (PNG, JPG, etc.).
3. QR decoded → `otpauth://` URI extracted → account created.

## 9.5 Copy Code

1. Click on a code → copied to clipboard.
2. Toast notification: "Copied!"
3. Keyboard shortcut: select account with arrow keys, press `Enter` to copy.

## 9.6 Switch Workspace

1. Open settings modal (⚙ icon in header).
2. Select a workspace from the list → account list updates.
3. Keyboard shortcut: `Ctrl+1` through `Ctrl+9` for workspace 1–9.

## 9.7 Manage Workspaces

1. Open settings modal → workspace section.
2. Add new workspace, rename, or delete.
3. Deleting a workspace requires confirmation.

## 9.8 Export Vault

1. Menu → Export Vault.
2. File save dialog → choose location.
3. Vault exported as JSON backup file.

## 9.9 Import Vault / Merge

1. Menu → Import Vault.
2. File picker → select backup file.
3. Merge strategy: import all accounts, skip duplicates (matched by issuer + account + secret).

------------------------------------------------------------------------

# 10. Application Layout

```
┌────────────────────────────────────────┐
│ [Logo] LightAuth              [⚙]     │
├────────────────────────────────────────┤
│ [🔍 Search accounts...]               │
├────────────────────────────────────────┤
│ SwipeableList                          │
│ ┌────────────────────────────────────┐ │
│ │ ← [edit] [Google]        482 193  │ │
│ │            user@gmail.com  18s ██▓ │ │
│ ├────────────────────────────────────┤ │
│ │ ← [edit] [GitHub]        719 054  │ │
│ │            username        12s █▓░ │ │
│ ├────────────────────────────────────┤ │
│ │ ← [edit] [AWS]           305 827  │ │
│ │            admin@co.com     4s ▓░░ │ │
│ └────────────────────────────────────┘ │
│  ← swipe left: edit / delete          │
│  → swipe right: copy code             │
│  ↕ drag-and-drop reorder              │
├────────────────────────────────────────┤
│ [+ Add Account]                        │
└────────────────────────────────────────┘
```

**Fixed window width**: ~480px (compact, phone-like proportions on desktop).
Max width constrained; not resizable beyond bounds. No sidebar.

- **Header**: Logo on the left, settings icon (⚙) on the right.
- **Search bar**: Below header, instant filter by issuer/account name.
- **Account list**: Uses `SwipeableList` from `@kumix/ui/motion/swipeable-list`.
- Swipe left reveals: Edit, Delete actions.
- Swipe right reveals: Copy Code action.
- Drag-and-drop reordering via long press or dedicated handle.
- **Settings modal** (via ⚙ icon): workspace management (switch/add/delete), theme switcher.

------------------------------------------------------------------------

# 11. Account List

## 11.1 SwipeableList View

Uses `SwipeableList` from `@kumix/ui/motion/swipeable-list`.

Each row (`SwipeableListItem`) renders:
- **leading**: Issuer icon (favicon or first-letter avatar)
- **title**: Issuer name
- **description**: Account name (email/username)
- **meta**: TOTP code (large, monospaced) + countdown seconds
- **content** (custom via `renderItem`): code + circular countdown ring

Swipe actions:
- **Right actions** (swipe left to reveal): Edit, Delete
- **Left actions** (swipe right to reveal): Copy Code

Click on code area also copies to clipboard.

## 11.2 Drag-and-Drop Reorder

- Accounts are reorderable via drag-and-drop.
- Custom order persisted to vault.
- Default sort: user-defined custom order.

## 11.3 Search

- Search by issuer or account name (instant filter in search bar below header).

------------------------------------------------------------------------

# 12. Security Model

## 12.1 Local Storage

- Vault stored as a local JSON file in the app data directory.
- No master password, no encryption layer — the app opens instantly.
- Relies on OS-level user account protection (file permissions, OS login).

## 12.2 Secret Handling

- No secrets written to logs.
- Secrets are never transmitted over the network.

------------------------------------------------------------------------

# 13. Settings

| Setting | Default | Options |
|---|---|---|
| Theme | System | Light / Dark / System |
| Default digits | 6 | 6 / 8 |
| Default algorithm | SHA1 | SHA1 / SHA256 / SHA512 |
| Default period | 30s | 15 / 30 / 60 |
| Start minimized | Off | On / Off |
| Minimize to tray | On | On / Off |
| Clipboard auto-clear | 30s | Off / 10 / 30 / 60s |

Settings stored in a separate unencrypted config file
(`~/.lightauth/config.json`) — no secrets in this file.

------------------------------------------------------------------------

# 14. Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Search accounts | `Ctrl+K` or `Ctrl+F` |
| Add account (manual) | `Ctrl+N` |
| Import URI | `Ctrl+I` |
| Import QR image | `Ctrl+Q` |
| Open settings | `Ctrl+,` |
| Switch workspace 1–9 | `Ctrl+1` … `Ctrl+9` |
| Copy selected code | `Enter` |
| Navigate accounts | `↑` / `↓` |

------------------------------------------------------------------------

# 15. Import & Export Formats

## 15.1 Import

| Source | Format |
|---|---|
| `otpauth://` URI | Single or multi-line paste |
| QR code image | PNG, JPG, BMP, WebP (decoded to `otpauth://` URI) |
| Backup file | LightAuth `.lightauth-backup` JSON file |
| Plain text | Future: CSV / JSON import for migration from other authenticators |

## 15.2 Export

| Target | Format |
|---|---|
| Backup file | `.lightauth-backup` JSON file |
| Plain text export | Future: CSV / JSON (requires explicit confirmation — secrets exposed) |

------------------------------------------------------------------------

# 16. Tauri Backend Commands

The Rust backend exposes these Tauri commands to the frontend:

```
// Vault lifecycle
vault_exists() → bool
vault_init() → Result<()>

// Workspaces
workspace_list() → Result<Vec<Workspace>>
workspace_create(name: String, icon: String) → Result<Workspace>
workspace_update(id: String, name: String, icon: String) → Result<Workspace>
workspace_delete(id: String) → Result<()>
workspace_reorder(ids: Vec<String>) → Result<Vec<Workspace>>

// Accounts
account_list(workspace_id: String) → Result<Vec<AccountWithCode>>
account_create(input: AccountInput) → Result<Account>
account_update(id: String, patch: AccountPatch) → Result<Account>
account_delete(id: String) → Result<()>
account_reorder(ids: Vec<String>) → Result<Vec<Account>>
account_import_uri(workspace_id: String, uri: String) → Result<Account>
account_import_qr(workspace_id: String) → Result<ImportQrResult>
account_move(id: String, workspace_id: String) → Result<Account>

// Backup
vault_export(path: String) → Result<()>
vault_import(path: String) → Result<ImportResult>

// TOTP
totp_generate(account_id: String) → Result<TotpCode>
totp_generate_all(workspace_id: String) → Result<Vec<AccountWithCode>>
```

------------------------------------------------------------------------

# 17. Frontend Architecture

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Root component, routing
├── components/
│   ├── layout/
│   │   └── header.tsx          # Logo + settings icon
│   ├── onboarding/
│   │   └── welcome-screen.tsx  # First-time empty state / prompt to add first account
│   ├── accounts/
│   │   ├── account-list.tsx    # Main account list with codes
│   │   ├── account-card.tsx    # Single account card/row
│   │   ├── account-form.tsx    # Add/edit account dialog
│   │   ├── import-uri.tsx      # URI import dialog
│   │   └── import-qr.tsx       # QR import dialog
│   ├── workspaces/
│   │   └── workspace-form.tsx  # Create/edit workspace (inside settings modal)
│   ├── settings/
│   │   └── settings-page.tsx   # Settings panel
│   └── shared/
│       ├── countdown-ring.tsx  # Circular countdown indicator
│       └── confirm-dialog.tsx  # Reusable confirmation dialog
├── hooks/
│   ├── use-vault.ts            # Vault status
│   ├── use-workspace.ts        # Active workspace state
│   ├── use-accounts.ts         # Account CRUD operations
│   └── use-totp.ts             # TOTP code polling
├── lib/
│   ├── commands.ts             # Tauri invoke wrappers
│   └── utils.ts                # Shared utilities
├── stores/
│   └── app-store.ts            # Global app state (active workspace, view preferences)
├── types/
│   ├── vault.ts                # Workspace types
│   ├── account.ts              # Account, TOTP code types
│   └── settings.ts             # Settings types
└── styles/
    └── index.css               # Global styles, Tailwind imports
```

------------------------------------------------------------------------

# 18. Rust Backend Architecture

```
src-tauri/src/
├── main.rs                     # Tauri entry point
├── lib.rs                      # Plugin registration, command registration
├── vault/
│   ├── mod.rs                  # Vault module
│   ├── storage.rs              # Vault file read/write (plain JSON)
│   └── types.rs                # Vault data structures
├── totp/
│   ├── mod.rs                  # TOTP module
│   └── generator.rs            # RFC 6238 TOTP generation
├── import/
│   ├── mod.rs                  # Import module
│   ├── uri.rs                  # otpauth:// URI parser
│   └── qr.rs                   # QR code image decoder
├── commands/
│   ├── mod.rs                  # Command module
│   ├── vault_commands.rs       # Vault lifecycle commands
│   ├── workspace_commands.rs   # Workspace CRUD commands
│   ├── account_commands.rs     # Account CRUD commands
│   └── backup_commands.rs      # Import/export commands
└── state.rs                    # AppState (Mutex<Vault>)
```

------------------------------------------------------------------------

# 19. Release Milestones

## v0.1.0 — Core

- Vault creation (auto, no password).
- Single default workspace.
- Add/edit/delete accounts (manual entry + URI paste).
- TOTP code generation with live countdown.
- One-click copy to clipboard.
- Search/filter accounts.
- Light/dark theme.

## v0.2.0 — Workspaces & Organization

- Multiple workspaces with CRUD.
- Drag-and-drop reordering.
- Move accounts between workspaces.
- QR code image import.

## v0.3.0 — Backup & Polish

- Vault export/import (JSON backup).
- Clipboard auto-clear.
- System tray with minimize-to-tray.
- Keyboard shortcuts.
- Settings panel.

## v0.4.0 — Migration & Distribution

- CSV/JSON import from Google Authenticator, Authy, etc.
- Installer builds for Windows, macOS, Linux.
- Auto-update via Tauri updater plugin.

------------------------------------------------------------------------

# 20. Success Metrics

1. Cold start to first code visible: < 300ms (no unlock step).
2. Code copy to clipboard: < 100ms (click to clipboard).
3. Vault file size: < 1MB for 1000 accounts.
4. Binary size: < 15MB (Tauri target).
5. Zero network calls in production builds.

------------------------------------------------------------------------

# 21. Open Questions

1. **Tray icon behavior:** Always show in tray, or only when minimized?
2. **Multi-vault support:** Single vault per user, or allow multiple vault files?
3. **Issuer icons:** Bundle common issuer icons, or generate from first letter only?
4. **Accessibility:** Screen reader support for countdown timers — announce when code refreshes?
5. **Optional encryption:** Add opt-in master password in future version for users who want extra security?
6. **Group feature:** Add sub-grouping within workspaces in future version?
