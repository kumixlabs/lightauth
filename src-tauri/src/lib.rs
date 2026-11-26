pub mod commands;
pub mod import;
pub mod state;
pub mod totp;
pub mod vault;

use tauri::Manager;

use state::AppState;
use std::sync::Mutex;
use vault::storage::load_vault;

use commands::account_commands::*;
use commands::vault_commands::*;
use commands::workspace_commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let vault = load_vault();

    tauri::Builder::default()
        // Single instance: a second launch focuses the running window
        // instead of spawning a duplicate.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            vault: Mutex::new(vault),
        })
        .invoke_handler(tauri::generate_handler![
            // Vault
            vault_export,
            vault_import,
            // Workspaces
            workspace_list,
            workspace_create,
            workspace_update,
            workspace_delete,
            workspace_export,
            workspace_import,
            // Accounts
            account_list,
            account_create,
            account_update,
            account_delete,
            account_reorder,
            account_import_uri,
            account_import_qr,
            account_move,
        ])
        .run(tauri::generate_context!())
        .expect("error while running LightAuth");
}
