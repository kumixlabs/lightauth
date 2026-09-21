use tauri::State;

use crate::state::AppState;
use crate::totp::generator::generate_code;
use crate::vault::storage;
use crate::vault::types::{Account, ImportResult, Workspace};

#[derive(serde::Serialize, serde::Deserialize)]
pub struct WorkspaceAccountExport {
    pub issuer: String,
    pub account: String,
    pub secret: String,
    #[serde(default = "default_algo")]
    pub algorithm: String,
    #[serde(default = "default_digits")]
    pub digits: u8,
    #[serde(default = "default_period")]
    pub period: u32,
}

fn default_algo() -> String {
    "SHA1".to_string()
}
fn default_digits() -> u8 {
    6
}
fn default_period() -> u32 {
    30
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct WorkspaceExportData {
    pub version: u32,
    pub workspace_name: String,
    pub accounts: Vec<WorkspaceAccountExport>,
}

#[derive(serde::Deserialize)]
#[serde(untagged)]
enum WorkspaceImportPayload {
    Wrapped(WorkspaceExportData),
    List(Vec<WorkspaceAccountExport>),
}

#[tauri::command]
pub fn workspace_list(state: State<AppState>) -> Result<Vec<Workspace>, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let mut ws = vault.workspaces.clone();
    ws.sort_by_key(|w| w.sort_order);
    for w in &mut ws {
        w.account_count = vault.accounts.iter().filter(|a| a.workspace_id == w.id).count();
    }
    Ok(ws)
}

#[tauri::command]
pub fn workspace_create(
    name: String,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let max_order = vault.workspaces.iter().map(|w| w.sort_order).max().unwrap_or(-1);
    let ws = Workspace {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        sort_order: max_order + 1,
        created_at: now.clone(),
        updated_at: now,
        account_count: 0,
    };
    vault.workspaces.push(ws.clone());
    storage::save_vault(&vault)?;
    Ok(ws)
}

#[tauri::command]
pub fn workspace_update(
    id: String,
    name: String,
    state: State<AppState>,
) -> Result<Workspace, String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    let ws = vault
        .workspaces
        .iter_mut()
        .find(|w| w.id == id)
        .ok_or("Workspace not found")?;
    ws.name = name;
    ws.updated_at = chrono::Utc::now().to_rfc3339();
    let result = ws.clone();
    storage::save_vault(&vault)?;
    Ok(result)
}

#[tauri::command]
pub fn workspace_delete(id: String, state: State<AppState>) -> Result<(), String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    if vault.workspaces.len() <= 1 {
        return Err("Cannot delete the last workspace".into());
    }
    vault.workspaces.retain(|w| w.id != id);
    vault.accounts.retain(|a| a.workspace_id != id);
    storage::save_vault(&vault)?;
    Ok(())
}

#[tauri::command]
pub fn workspace_reorder(ids: Vec<String>, state: State<AppState>) -> Result<Vec<Workspace>, String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    for (i, id) in ids.iter().enumerate() {
        if let Some(ws) = vault.workspaces.iter_mut().find(|w| &w.id == id) {
            ws.sort_order = i as i32;
        }
    }
    storage::save_vault(&vault)?;
    let mut ws = vault.workspaces.clone();
    ws.sort_by_key(|w| w.sort_order);
    Ok(ws)
}

#[tauri::command]
pub fn workspace_export(
    workspace_id: String,
    path: String,
    state: State<AppState>,
) -> Result<(), String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let ws = vault
        .workspaces
        .iter()
        .find(|w| w.id == workspace_id)
        .ok_or("Workspace not found")?;

    let accounts: Vec<WorkspaceAccountExport> = vault
        .accounts
        .iter()
        .filter(|a| a.workspace_id == workspace_id)
        .map(|a| WorkspaceAccountExport {
            issuer: a.issuer.clone(),
            account: a.account.clone(),
            secret: a.secret.clone(),
            algorithm: a.algorithm.clone(),
            digits: a.digits,
            period: a.period,
        })
        .collect();

    let export = WorkspaceExportData {
        version: 1,
        workspace_name: ws.name.clone(),
        accounts,
    };

    let data = serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| format!("Failed to write export: {e}"))
}

#[tauri::command]
pub fn workspace_import(
    workspace_id: String,
    path: String,
    state: State<AppState>,
) -> Result<ImportResult, String> {
    let data = std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {e}"))?;
    let payload: WorkspaceImportPayload =
        serde_json::from_str(&data).map_err(|e| format!("Invalid workspace backup format: {e}"))?;

    let incoming_accounts = match payload {
        WorkspaceImportPayload::Wrapped(wrapped) => wrapped.accounts,
        WorkspaceImportPayload::List(list) => list,
    };

    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    if !vault.workspaces.iter().any(|w| w.id == workspace_id) {
        return Err("Target workspace not found".into());
    }

    let mut imported = 0u32;
    let mut skipped = 0u32;
    let now = chrono::Utc::now().to_rfc3339();

    for acc in incoming_accounts {
        let clean_secret = acc.secret.trim().replace(' ', "").to_uppercase();
        // Skip invalid secrets
        if generate_code(&clean_secret, &acc.algorithm, acc.digits, acc.period).is_err() {
            skipped += 1;
            continue;
        }

        let exists = vault.accounts.iter().any(|a| {
            a.workspace_id == workspace_id
                && a.issuer == acc.issuer
                && a.account == acc.account
                && a.secret.trim().replace(' ', "").to_uppercase() == clean_secret
        });

        if exists {
            skipped += 1;
        } else {
            let max_order = vault
                .accounts
                .iter()
                .filter(|a| a.workspace_id == workspace_id)
                .map(|a| a.sort_order)
                .max()
                .unwrap_or(-1);

            vault.accounts.push(Account {
                id: uuid::Uuid::new_v4().to_string(),
                workspace_id: workspace_id.clone(),
                issuer: acc.issuer,
                account: acc.account,
                secret: clean_secret,
                algorithm: acc.algorithm,
                digits: acc.digits,
                period: acc.period,
                sort_order: max_order + 1,
                created_at: now.clone(),
                updated_at: now.clone(),
            });
            imported += 1;
        }
    }

    storage::save_vault(&vault)?;
    Ok(ImportResult { imported, skipped })
}
