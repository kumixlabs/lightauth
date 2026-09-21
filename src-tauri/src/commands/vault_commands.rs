use tauri::State;

use crate::state::AppState;
use crate::vault::storage;
use crate::vault::types::ImportResult;

#[tauri::command]
pub fn vault_exists() -> bool {
    storage::vault_path().exists()
}

#[tauri::command]
pub fn vault_init(state: State<AppState>) -> Result<(), String> {
    let vault = crate::vault::types::Vault::default();
    storage::save_vault(&vault)?;
    let mut v = state.vault.lock().map_err(|e| e.to_string())?;
    *v = vault;
    Ok(())
}

#[tauri::command]
pub fn vault_export(path: String, state: State<AppState>) -> Result<(), String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let data = serde_json::to_string_pretty(&*vault).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| format!("Failed to write backup: {e}"))
}

#[tauri::command]
pub fn vault_import(path: String, state: State<AppState>) -> Result<ImportResult, String> {
    let data = std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {e}"))?;
    let incoming: crate::vault::types::Vault =
        serde_json::from_str(&data).map_err(|e| format!("Invalid vault file: {e}"))?;

    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;

    let mut imported = 0u32;
    let mut skipped = 0u32;

    for account in incoming.accounts {
        let exists = vault.accounts.iter().any(|a| {
            a.issuer == account.issuer
                && a.account == account.account
                && a.secret == account.secret
        });
        if exists {
            skipped += 1;
        } else {
            // Ensure workspace exists
            if !vault.workspaces.iter().any(|w| w.id == account.workspace_id) {
                // Find matching workspace from incoming by id, or use first workspace
                if let Some(iw) = incoming.workspaces.iter().find(|w| w.id == account.workspace_id) {
                    vault.workspaces.push(iw.clone());
                } else if let Some(first) = vault.workspaces.first() {
                    let mut a = account.clone();
                    a.workspace_id = first.id.clone();
                    vault.accounts.push(a);
                    imported += 1;
                    continue;
                }
            }
            vault.accounts.push(account);
            imported += 1;
        }
    }

    storage::save_vault(&vault)?;

    Ok(ImportResult { imported, skipped })
}
