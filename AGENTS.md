# Build commands
- `bun install` — install deps
- `bun run types:check` — typescript typecheck
- `bun run lint` — biome check
- `bun run build` — frontend build (tsc + vite)
- `cargo check` — rust typecheck (run in src-tauri/)
- `bun tauri dev` — full dev launch
- `bun tauri build` — production build

# Architecture
- Product: LightAuth — lightweight offline desktop TOTP authenticator (PRD: LightAuth-PRD.md). Version source of truth: `package.json` (keep `src-tauri/tauri.conf.json` + `src-tauri/Cargo.toml` in sync on release).
- State: zustand store at src/stores/app-store.ts (persisted: activeWorkspaceId, settings)
- Vault storage: plain JSON at `$APPDATA/lightauth/vault.json` (no encryption, no master password)
- Rust backend: src-tauri/src/ — vault CRUD (vault/), TOTP generation (totp/), QR decode & URI parse (import/), Tauri commands (commands/), system tray (tray.rs)
- Frontend: React + TypeScript + @kumix/ui components
- Account list: SwipeableList from @kumix/ui/motion/swipeable-list with long-press (500ms) drag reorder via framer-motion Reorder
- Release CI: .github/workflows/release.yml (Windows/macOS/Linux matrix; release on `v*` tags)

# Key rules
- Fully offline. Zero network calls except optional updater check.
- No master password, no encryption — vault is plain JSON.
- No new runtime dependency unless stdlib/platform truly cannot do it.
- Secret key auto-sanitized: strip whitespace + uppercase on input.
- Clipboard auto-clear after configurable timer (default 30s).
- Scope: TOTP authenticator only. No password manager, no cloud sync, no browser extension.
