use tauri::State;

use crate::state::AppState;
use crate::vault::storage;
use crate::vault::types::Workspace;

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
    storage::save_vault(&vault);
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
    storage::save_vault(&vault);
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
    storage::save_vault(&vault);
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
    storage::save_vault(&vault);
    let mut ws = vault.workspaces.clone();
    ws.sort_by_key(|w| w.sort_order);
    Ok(ws)
}
