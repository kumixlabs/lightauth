# LightAuth

A lightweight, offline-first desktop 2FA authenticator built with Tauri 2, Rust, React, and Tailwind CSS.

![LightAuth](public/favicon.png)

## Features

- **Offline-First & Private** — Zero telemetry, zero network requests (except optional updater checks). Secrets never leave your machine.
- **Plain JSON Vault** — Unencrypted, accessible storage at `%APPDATA%/lightauth/vault.json` (or `~/.config/lightauth/vault.json` on Linux/macOS).
- **Fast TOTP Generation** — RFC 6238 compliant using Rust's `totp-rs`. Supports SHA1, SHA256, SHA512, 6 or 8 digits, custom periods.
- **Multiple Workspaces** — Organize 2FA accounts by context (e.g. *Personal*, *Work*, *Crypto*) with live account counters.
- **Easy Import** — Import via standard `otpauth://` URI or QR code images directly.
- **One-Click Copy & Visual Feedback** — Click anywhere on an account card to copy the code. Animated check icon and emerald feedback.
- **Clipboard Auto-Clear** — Automatically clears 2FA codes from your clipboard after a configurable timer (15s, 30s, 60s, or disabled).
- **System Tray Support** — Minimize to tray on close, left-click to toggle, right-click menu to show or quit.
- **Gestures & Drag Reorder** — Swipe right to copy, swipe left to edit or delete. Long press (500ms) to enter drag-and-drop reorder mode.
- **Theme Support** — System, Light, and Dark modes.
- **Backup & Restore** — Timestamped JSON export and import for seamless migrations.

## Tech Stack

- **Framework**: [Tauri 2](https://v2.tauri.app/)
- **Core Backend**: Rust (`totp-rs`, `rqrr`, `image`, `serde_json`)
- **Frontend**: React 19, TypeScript, Vite
- **UI Components**: `@kumix/ui`, Radix UI, Lucide Icons
- **Animations**: Framer Motion
- **Package Manager**: [Bun](https://bun.sh/)

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + N` | Add new account manually |
| `Ctrl + I` | Import `otpauth://` URI |
| `Ctrl + F` / `Ctrl + K` | Focus account search bar |
| `Ctrl + ,` | Open Settings modal |
| `Ctrl + 1` .. `9` | Switch between workspaces |
| `Esc` | Exit reorder mode or close modals |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- Platform dependencies for Tauri: see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
# Install dependencies
bun install

# Run in development mode
bun tauri dev
```

### Production Build

```bash
bun tauri build
```

The compiled installer and standalone binary will be generated under `src-tauri/target/release/bundle/`.

## License

MIT
