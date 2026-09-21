use url::Url;

use crate::vault::types::AccountInput;

/// Parse an `otpauth://totp/...` URI into an AccountInput.
pub fn parse_otpauth_uri(uri: &str) -> Result<AccountInput, String> {
    let url = Url::parse(uri.trim()).map_err(|e| format!("Invalid URI: {e}"))?;

    if url.scheme() != "otpauth" {
        return Err("URI must start with otpauth://".into());
    }
    if url.host_str() != Some("totp") {
        return Err("Only TOTP URIs are supported".into());
    }

    let label = url.path().trim_start_matches('/');
    let (issuer_from_label, account_name) = if let Some(idx) = label.find(':') {
        (
            urlencoding::decode(&label[..idx]).unwrap_or_default().to_string(),
            urlencoding::decode(&label[idx + 1..]).unwrap_or_default().to_string(),
        )
    } else {
        (String::new(), urlencoding::decode(label).unwrap_or_default().to_string())
    };

    let params: std::collections::HashMap<_, _> = url.query_pairs().collect();

    let secret = params
        .get("secret")
        .ok_or("Missing 'secret' parameter")?
        .to_string();

    let issuer = params
        .get("issuer")
        .map(|s| s.to_string())
        .unwrap_or(issuer_from_label);

    let algorithm = params
        .get("algorithm")
        .map(|s| s.to_uppercase())
        .unwrap_or_else(|| "SHA1".into());

    let digits = params
        .get("digits")
        .and_then(|s| s.parse().ok())
        .unwrap_or(6);

    let period = params
        .get("period")
        .and_then(|s| s.parse().ok())
        .unwrap_or(30);

    Ok(AccountInput {
        issuer,
        account: account_name,
        secret,
        algorithm,
        digits,
        period,
    })
}
