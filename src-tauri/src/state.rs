use std::sync::Mutex;
use crate::vault::types::Vault;

pub struct AppState {
    pub vault: Mutex<Vault>,
}
