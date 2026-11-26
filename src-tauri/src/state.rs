use crate::vault::types::Vault;
use std::sync::Mutex;

pub struct AppState {
    pub vault: Mutex<Vault>,
}
