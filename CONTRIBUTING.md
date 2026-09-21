# Contributing to LightAuth

Thank you for your interest in contributing! LightAuth is a lightweight offline desktop TOTP authenticator built with Tauri 2, React, TypeScript, @kumix/ui, and Tailwind CSS.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.4.0 or higher
- [Rust](https://rustup.rs) (stable toolchain)
- Platform dependencies for Tauri: see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
  - **Windows**: Microsoft Visual Studio C++ Build Tools + WebView2
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

### Setup

```bash
git clone https://github.com/kumixlabs/lightauth.git
cd lightauth
bun install
```

### Development

```bash
bun tauri dev        # full desktop app (hot reload)
bun run dev          # frontend only (vite)
```

### Checks

Run all of these before committing:

```bash
bun run lint         # biome check
bun run types:check  # tsc --noEmit
bun run build        # tsc -b && vite build
cargo check          # in src-tauri/
```

## Project Rules

Read [AGENTS.md](./AGENTS.md) for the full architecture notes. The non-negotiables:

1. **Fully offline.** Zero network calls except optional updater check.
2. **No encryption, no master password.** Vault is plain JSON — simplicity over complexity.
3. **No new runtime dependency** unless stdlib/platform truly cannot do it.
4. **Scope**: TOTP authenticator only. No password manager, no cloud sync, no browser extension.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add system tray support
fix: clipboard auto-clear not triggering
docs: update README keyboard shortcuts
```

## Releases (Maintainers Only)

Releases are automated via GitHub Actions (`.github/workflows/release.yml`):

1. Bump version in **all three files** (kept in sync): `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`. Update `CHANGELOG.md`.
2. Commit, tag `vX.Y.Z`, push. CI builds Windows (NSIS + portable), macOS (dmg x2), and Linux (AppImage + deb), signs updater artifacts, and publishes the GitHub Release.
3. Users on older versions get the update via the built-in auto-updater.

## Security

Report vulnerabilities privately as described in [SECURITY.md](./SECURITY.md). Do not open public issues for security problems.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
