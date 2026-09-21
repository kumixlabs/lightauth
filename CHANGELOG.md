# Changelog

All notable changes to LightAuth will be documented in this file.

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
