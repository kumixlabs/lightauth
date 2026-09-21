use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub account_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub workspace_id: String,
    pub issuer: String,
    pub account: String,
    pub secret: String,
    #[serde(default = "default_algorithm")]
    pub algorithm: String,
    #[serde(default = "default_digits")]
    pub digits: u8,
    #[serde(default = "default_period")]
    pub period: u32,
    #[serde(default)]
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountWithCode {
    #[serde(flatten)]
    pub account: Account,
    pub code: String,
    pub seconds_remaining: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vault {
    pub workspaces: Vec<Workspace>,
    pub accounts: Vec<Account>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AccountInput {
    pub issuer: String,
    pub account: String,
    pub secret: String,
    #[serde(default = "default_algorithm")]
    pub algorithm: String,
    #[serde(default = "default_digits")]
    pub digits: u8,
    #[serde(default = "default_period")]
    pub period: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AccountPatch {
    pub issuer: Option<String>,
    pub account: Option<String>,
    pub secret: Option<String>,
    pub algorithm: Option<String>,
    pub digits: Option<u8>,
    pub period: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported: u32,
    pub skipped: u32,
}

fn default_algorithm() -> String {
    "SHA1".to_string()
}

fn default_digits() -> u8 {
    6
}

fn default_period() -> u32 {
    30
}

impl Default for Vault {
    fn default() -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            workspaces: vec![Workspace {
                id: uuid::Uuid::new_v4().to_string(),
                name: "Personal".to_string(),
                sort_order: 0,
                created_at: now.clone(),
                updated_at: now,
                account_count: 0,
            }],
            accounts: vec![],
        }
    }
}
