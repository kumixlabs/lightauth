use std::fs;
use std::path::PathBuf;

use crate::vault::types::Vault;

fn vault_path() -> PathBuf {
    let dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("lightauth");
    fs::create_dir_all(&dir).ok();
    dir.join("vault.json")
}

pub fn load_vault() -> Vault {
    let path = vault_path();
    if path.exists() {
        let data = fs::read_to_string(&path).unwrap_or_default();
        match serde_json::from_str(&data) {
            Ok(vault) => return vault,
            Err(_) => {
                // Preserve the corrupt file for manual recovery instead of
                // silently replacing it with an empty vault on next save.
                // Timestamped so a second corruption never overwrites the first backup.
                let bak =
                    path.with_extension(format!("{}.json.bak", chrono::Utc::now().timestamp()));
                if let Err(e) = fs::rename(&path, &bak) {
                    eprintln!("Failed to preserve corrupt vault as {}: {e}", bak.display());
                }
            }
        }
    }
    let vault = Vault::default();
    save_vault(&vault).ok();
    vault
}

pub fn save_vault(vault: &Vault) -> Result<(), String> {
    let path = vault_path();
    let tmp_path = path.with_extension("tmp");
    let data = serde_json::to_string_pretty(vault).map_err(|e| format!("Serialize error: {e}"))?;
    fs::write(&tmp_path, data).map_err(|e| format!("Failed to write vault temp: {e}"))?;
    fs::rename(&tmp_path, &path).map_err(|e| format!("Failed to save vault: {e}"))
}
