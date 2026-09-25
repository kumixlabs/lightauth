# Changelog

All notable changes to LightAuth will be documented in this file.

## 0.1.6

### Features

- Support text paste of Google Authenticator migration URIs (`otpauth-migration://offline?data=...`) in URI import dialog.
- Frontend test suite with `bun test` covering secret sanitization, TOTP code formatting, and store actions.
- Backend test suite with `cargo test` covering RFC 6238 TOTP generation, URI parsing, and protobuf migration decoding.
- CI integration: automated test runs for both frontend and backend on PR and push.

### Fixes & Improvements

- Prevent accidental drag-and-drop reorder mode trigger when clicking, dragging, or scrolling with the scrollbar.
- Atomic vault storage: write to `.tmp` and atomic rename to eliminate risk of vault corruption or 0-byte files on crash.
- Full whitespace stripping on secrets at both Rust boundary and client form inputs (supports grouped Base32 strings like `JBSW Y3DP`).
- Refactored QR decoding fallback chain to eliminate closure heap allocations and satisfy Clippy strict checks.
- Unified `account_import_uri` return signature to return structured `ImportResult` (imported/skipped counts).

## 0.1.5

### Features

- Google Authenticator migration QR import — decode `otpauth-migration://` protobuf format with batch multi-account import.
- QR decode fallback chain — auto-retry with 2× and 3× upscale for low-quality phone photos.
- Import progress dialog — loading spinner shown while decoding QR and importing accounts.

### Fixes & Improvements

- Copy button no longer triggers duplicate click events.
- Secret field shows read-only label during account editing.
- Error toast on complete URI batch import failure.
- QR import returns detailed count (imported/skipped) instead of single account.

## 0.1.4

### Features

- Per-workspace export and import — backup or restore accounts for the active workspace as clean JSON without workspace metadata.
- Integrated `@kumix/ui` `ConfirmDialog` for delete actions (replaces native OS dialogs).

### Fixes & Improvements

- Stop click event propagation on TOTP code button to prevent duplicate copy triggers.
- Clearer visual indicator for read-only secret field during account editing.
- Error toast notification when batch URI import fails completely.
- Removed unused `dialog:allow-ask` capability.

## 0.1.3

### Fixes

- Add `createUpdaterArtifacts: true` to bundle config — enables `.sig` files and `latest.json` generation for auto-updater.

## 0.1.2

### Fixes

- Hide console window on Windows release build.
- QR import now validates secret before saving.
- `save_vault` propagates write errors instead of silently ignoring.
- Guard against `period=0` division by zero in TOTP generator.
- Typed `ImportResult` struct replaces untyped `serde_json::Value`.
- Native Tauri confirm dialogs replace ugly browser `confirm()`.
- Long-press reorder cancels on pointer movement (prevents accidental trigger during scroll).
- Removed dead `totpGenerate` / `totpGenerateAll` commands.
- Merged duplicate `loadAccounts` / `refreshCodes` store actions.
- Version sync across all manifests (`package.json`, `tauri.conf.json`, `Cargo.toml`).

## 0.1.0

Initial release.

### Core

- Offline-first desktop TOTP authenticator (Tauri 2 + React + TypeScript).
- Windows first; macOS & Linux builds shipped via GitHub Releases (NSIS installer + portable exe, DMG, AppImage + deb).

### Features

- RFC 6238 compliant TOTP generation (SHA1, SHA256, SHA512; 6/8 digits; configurable period) via Rust `totp-rs`.
- Import accounts via `otpauth://` URI or QR code image scanning.
- Multiple workspaces for organizing 2FA accounts with live account counters in the switcher.
- One-click copy with visual feedback (emerald check icon + "Copied" text, 1.5s).
- Clipboard auto-clear after configurable timer (15s, 30s, 60s, or off).
- System tray support: minimize to tray on close, left-click toggle, right-click menu (Show/Quit).
- Long-press (500ms) drag-and-drop reorder via framer-motion Reorder.
- Swipe gestures: left to copy, right to edit/delete.
- Theme support: System, Light, Dark.
- Timestamped JSON vault backup & restore.
- Keyboard shortcuts: Ctrl+N (add), Ctrl+I (import URI), Ctrl+F/K (search), Ctrl+, (settings), Ctrl+1-9 (workspace switch).
- Secret key auto-sanitization: strips whitespace, forces uppercase on manual input.
- Auto-updater with signing key verification.
