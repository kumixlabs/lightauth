# Build & Test Commands
- `bun install` — install dependencies
- `bun run types:check` — TypeScript typecheck (`tsc -b`)
- `bun run lint` — Biome lint check
- `bun run lint:fix` — Biome auto-fix unsafe lint/format errors
- `bun test` — run frontend test suite (Bun test runner)
- `bun run build` — frontend production build (`tsc -b && vite build`)
- `cargo check` — Rust typecheck (run inside `src-tauri/`)
- `cargo clippy -- -D warnings` — Rust strict linter check
- `cargo test` — run Rust test suite (unit tests in `src-tauri/`)
- `bun tauri dev` — launch full development desktop environment
- `bun tauri build` — full production package build

# Architecture & Tech Stack
- **Product**: LightAuth — lightweight offline desktop TOTP authenticator (PRD: `LightAuth-PRD.md`).
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + `@kumix/ui` component library.
- **Backend**: Tauri 2 (Rust) + `totp-rs` (code generation) + `rqrr` & `image` (QR decoding) + `data-encoding` (Base32/Base64).
- **State**: Zustand store at `src/stores/app-store.ts` (persisted to `localStorage`: `activeWorkspaceId`, `settings`).
- **Vault storage**: Plain JSON at `$APPDATA/lightauth/vault.json` (or `~/.config/lightauth/vault.json` on Linux, `~/Library/Application Support/lightauth/vault.json` on macOS).
  - Storage writes are atomic: written to `vault.json.tmp` then renamed to `vault.json` to prevent file corruption.
  - Zero encryption, zero master password.
- **Account list UI**: `SwipeableList` from `@kumix/ui/motion/swipeable-list` with long-press (500ms) reorder mode powered by `framer-motion` `Reorder`.
- **Dialogs & Toasts**:
  - Always use `@kumix/ui/custom/toast` (`toastSuccess`, `toastError`, `ToastContainer`). Never introduce `sonner`.
  - Always use `@kumix/ui/custom/confirm-dialog` (`ConfirmDialog`) for destructive actions. Do not use native OS `ask()` dialogs.
- **System Tray**: `src-tauri/src/tray.rs` with toggle window, show/hide, quit, and close-to-tray handling.

# Import & Export Capabilities
- **Google Authenticator Migration**:
  - Decodes `otpauth-migration://offline?data=...` format via manual protobuf decoder in `src-tauri/src/import/migration.rs`.
  - Zero external protobuf crate; relies on `data-encoding` crate.
  - Supports both QR image import and URI string pasting in Import dialog.
- **QR Image Decoding**:
  - Sequential fallback chain in `src-tauri/src/import/qr.rs`: (1) raw grayscale -> (2) 2× nearest-neighbor upscale -> (3) 3× Lanczos upscale.
  - Handles low-quality mobile phone photos and screenshots.
- **Backup & Restore**:
  - Full Vault Backup / Import in Settings modal.
  - Per-Workspace Export / Import in Settings modal (clean JSON without workspace ID conflicts).
  - Duplicate detection rule: skips import if account has matching issuer, account name, and secret (case-insensitive).

# Key Project Rules
- **Version bumps**: Always bump ALL THREE manifests together: `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`. Tauri reads the version string from `tauri.conf.json`.
- **Git tags**: The user pushes git tags manually. Never create or push git tags from assistant tools.
- **Offline only**: Strictly zero outgoing/incoming network requests except the built-in Tauri updater check.
- **Zero runtime bloat**: Never add external dependencies if stdlib or existing crates/packages can handle it.
- **Secret sanitization**: Base32 secrets must always have all whitespace stripped (`\s+`) and converted to uppercase at both UI input and Rust TOTP generation boundaries.
- **Clipboard auto-clear**: Configurable auto-clear timer (default 30s, 15s, 60s, or disabled).
