use std::fs;
use std::path::PathBuf;

use crate::vault::types::Vault;

pub fn vault_path() -> PathBuf {
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
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        let vault = Vault::default();
        save_vault(&vault);
        vault
    }
}

pub fn save_vault(vault: &Vault) {
    let path = vault_path();
    if let Ok(data) = serde_json::to_string_pretty(vault) {
        fs::write(path, data).ok();
    }
}
