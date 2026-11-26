use tauri::State;

use crate::state::AppState;
use crate::totp::generator::{generate_code, sanitize_secret};
use crate::vault::storage;
use crate::vault::types::ImportResult;

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

    for mut account in incoming.accounts {
        let clean_secret = sanitize_secret(&account.secret);

        // Skip invalid secrets (same rule as workspace import)
        if generate_code(
            &clean_secret,
            &account.algorithm,
            account.digits,
            account.period,
        )
        .is_err()
        {
            skipped += 1;
            continue;
        }

        // Duplicate detection: issuer + account + secret, case-insensitive
        let exists = vault.accounts.iter().any(|a| {
            a.issuer == account.issuer
                && a.account == account.account
                && sanitize_secret(&a.secret) == clean_secret
        });
        if exists {
            skipped += 1;
            continue;
        }
        account.secret = clean_secret;

        // Ensure workspace exists
        if !vault
            .workspaces
            .iter()
            .any(|w| w.id == account.workspace_id)
        {
            if let Some(iw) = incoming
                .workspaces
                .iter()
                .find(|w| w.id == account.workspace_id)
            {
                vault.workspaces.push(iw.clone());
            } else if let Some(first) = vault.workspaces.first() {
                account.workspace_id = first.id.clone();
            } else {
                skipped += 1; // nowhere to place the account
                continue;
            }
        }
        vault.accounts.push(account);
        imported += 1;
    }

    storage::save_vault(&vault)?;

    Ok(ImportResult { imported, skipped })
}
