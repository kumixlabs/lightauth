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

    // Decode the whole label first: exporters (Google Authenticator, Aegis,
    // 2FAS) percent-encode the `Issuer:account` separator as %3A.
    let label = urlencoding::decode(url.path().trim_start_matches('/'))
        .unwrap_or_default()
        .to_string();
    let (issuer_from_label, account_name) = match label.find(':') {
        Some(idx) => (label[..idx].to_string(), label[idx + 1..].to_string()),
        None => (String::new(), label),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_standard_uri() {
        let uri = "otpauth://totp/GitHub:octocat?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30";
        let res = parse_otpauth_uri(uri).unwrap();
        assert_eq!(res.issuer, "GitHub");
        assert_eq!(res.account, "octocat");
        assert_eq!(res.secret, "JBSWY3DPEHPK3PXP");
        assert_eq!(res.algorithm, "SHA1");
        assert_eq!(res.digits, 6);
        assert_eq!(res.period, 30);
    }

    #[test]
    fn test_parse_uri_issuer_from_label() {
        let uri = "otpauth://totp/Google:user@gmail.com?secret=JBSWY3DPEHPK3PXP";
        let res = parse_otpauth_uri(uri).unwrap();
        assert_eq!(res.issuer, "Google");
        assert_eq!(res.account, "user@gmail.com");
        assert_eq!(res.digits, 6);
        assert_eq!(res.period, 30);
    }

    #[test]
    fn test_parse_uri_encoded_separator() {
        // Real-world export form: separator percent-encoded, account with + and %
        let uri = "otpauth://totp/ACME%20Corp%3Ajohn%2Btest%40acme.io?secret=JBSWY3DPEHPK3PXP";
        let res = parse_otpauth_uri(uri).unwrap();
        assert_eq!(res.issuer, "ACME Corp");
        assert_eq!(res.account, "john+test@acme.io");
    }

    #[test]
    fn test_parse_uri_missing_secret() {
        let uri = "otpauth://totp/Test:user";
        assert!(parse_otpauth_uri(uri).is_err());
    }

    #[test]
    fn test_parse_uri_invalid_scheme() {
        let uri = "https://example.com/totp?secret=JBSWY3DPEHPK3PXP";
        assert!(parse_otpauth_uri(uri).is_err());
    }
}
