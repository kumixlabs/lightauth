use std::path::PathBuf;

use tauri::State;

use crate::import::qr::decode_qr_image;
use crate::import::uri::parse_otpauth_uri;
use crate::state::AppState;
use crate::totp::generator::generate_code;
use crate::vault::storage;
use crate::vault::types::{Account, AccountPatch, AccountInput, AccountWithCode, ImportResult};

fn input_to_account(input: AccountInput, workspace_id: &str) -> Account {
    let now = chrono::Utc::now().to_rfc3339();
    Account {
        id: uuid::Uuid::new_v4().to_string(),
        workspace_id: workspace_id.to_string(),
        issuer: input.issuer,
        account: input.account,
        secret: input.secret,
        algorithm: input.algorithm,
        digits: input.digits,
        period: input.period,
        sort_order: 0,
        created_at: now.clone(),
        updated_at: now,
    }
}

fn account_with_code(account: &Account) -> AccountWithCode {
    let (code, seconds_remaining) = generate_code(
        &account.secret,
        &account.algorithm,
        account.digits,
        account.period,
    )
    .unwrap_or_else(|_| ("------".into(), 0));

    AccountWithCode {
        account: account.clone(),
        code,
        seconds_remaining,
    }
}

#[tauri::command]
pub fn account_list(
    workspace_id: String,
    state: State<AppState>,
) -> Result<Vec<AccountWithCode>, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let mut accounts: Vec<_> = vault
        .accounts
        .iter()
        .filter(|a| a.workspace_id == workspace_id)
        .collect();
    accounts.sort_by_key(|a| a.sort_order);
    Ok(accounts.iter().map(|a| account_with_code(a)).collect())
}

#[tauri::command]
pub fn account_create(
    workspace_id: String,
    input: AccountInput,
    state: State<AppState>,
) -> Result<Account, String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    let max_order = vault
        .accounts
        .iter()
        .filter(|a| a.workspace_id == workspace_id)
        .map(|a| a.sort_order)
        .max()
        .unwrap_or(-1);
    let mut account = input_to_account(input, &workspace_id);
    account.sort_order = max_order + 1;
    // Validate secret can generate a code
    generate_code(&account.secret, &account.algorithm, account.digits, account.period)?;
    vault.accounts.push(account.clone());
    storage::save_vault(&vault)?;
    Ok(account)
}

#[tauri::command]
pub fn account_update(
    id: String,
    patch: AccountPatch,
    state: State<AppState>,
) -> Result<Account, String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    let account = vault
        .accounts
        .iter_mut()
        .find(|a| a.id == id)
        .ok_or("Account not found")?;

    if let Some(issuer) = patch.issuer {
        account.issuer = issuer;
    }
    if let Some(name) = patch.account {
        account.account = name;
    }
    if let Some(secret) = patch.secret {
        account.secret = secret;
    }
    if let Some(algorithm) = patch.algorithm {
        account.algorithm = algorithm;
    }
    if let Some(digits) = patch.digits {
        account.digits = digits;
    }
    if let Some(period) = patch.period {
        account.period = period;
    }
    account.updated_at = chrono::Utc::now().to_rfc3339();
    let result = account.clone();
    storage::save_vault(&vault)?;
    Ok(result)
}

#[tauri::command]
pub fn account_delete(id: String, state: State<AppState>) -> Result<(), String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    vault.accounts.retain(|a| a.id != id);
    storage::save_vault(&vault)?;
    Ok(())
}

#[tauri::command]
pub fn account_reorder(
    ids: Vec<String>,
    state: State<AppState>,
) -> Result<Vec<Account>, String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    for (i, id) in ids.iter().enumerate() {
        if let Some(a) = vault.accounts.iter_mut().find(|a| &a.id == id) {
            a.sort_order = i as i32;
        }
    }
    storage::save_vault(&vault)?;
    Ok(vault.accounts.clone())
}

#[tauri::command]
pub fn account_import_uri(
    workspace_id: String,
    uri: String,
    state: State<AppState>,
) -> Result<ImportResult, String> {
    let uri = uri.trim();
    let inputs = if uri.starts_with("otpauth-migration://") {
        crate::import::migration::parse_migration_uri(uri)?
    } else {
        vec![parse_otpauth_uri(uri)?]
    };

    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    let mut imported: u32 = 0;
    let mut skipped: u32 = 0;

    for input in inputs {
        let is_dup = vault.accounts.iter().any(|a| {
            a.workspace_id == workspace_id
                && a.issuer == input.issuer
                && a.account == input.account
                && a.secret.to_uppercase() == input.secret.to_uppercase()
        });
        if is_dup {
            skipped += 1;
            continue;
        }

        let max_order = vault
            .accounts
            .iter()
            .filter(|a| a.workspace_id == workspace_id)
            .map(|a| a.sort_order)
            .max()
            .unwrap_or(-1);
        let mut account = input_to_account(input, &workspace_id);
        account.sort_order = max_order + 1;
        match generate_code(&account.secret, &account.algorithm, account.digits, account.period) {
            Ok(_) => {
                vault.accounts.push(account);
                imported += 1;
            }
            Err(_) => skipped += 1,
        }
    }

    storage::save_vault(&vault)?;
    Ok(ImportResult { imported, skipped })
}

#[tauri::command]
pub fn account_import_qr(
    workspace_id: String,
    path: String,
    state: State<AppState>,
) -> Result<ImportResult, String> {
    let inputs = decode_qr_image(&PathBuf::from(&path))?;
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    let mut imported: u32 = 0;
    let mut skipped: u32 = 0;

    for input in inputs {
        // Skip duplicates (same issuer + account + secret)
        let is_dup = vault.accounts.iter().any(|a| {
            a.workspace_id == workspace_id
                && a.issuer == input.issuer
                && a.account == input.account
                && a.secret.to_uppercase() == input.secret.to_uppercase()
        });
        if is_dup {
            skipped += 1;
            continue;
        }

        let max_order = vault
            .accounts
            .iter()
            .filter(|a| a.workspace_id == workspace_id)
            .map(|a| a.sort_order)
            .max()
            .unwrap_or(-1);
        let mut account = input_to_account(input, &workspace_id);
        account.sort_order = max_order + 1;
        match generate_code(&account.secret, &account.algorithm, account.digits, account.period) {
            Ok(_) => {
                vault.accounts.push(account);
                imported += 1;
            }
            Err(_) => skipped += 1,
        }
    }

    storage::save_vault(&vault)?;
    Ok(ImportResult { imported, skipped })
}

#[tauri::command]
pub fn account_move(
    id: String,
    workspace_id: String,
    state: State<AppState>,
) -> Result<Account, String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    let account = vault
        .accounts
        .iter_mut()
        .find(|a| a.id == id)
        .ok_or("Account not found")?;
    account.workspace_id = workspace_id;
    account.updated_at = chrono::Utc::now().to_rfc3339();
    let result = account.clone();
    storage::save_vault(&vault)?;
    Ok(result)
}
