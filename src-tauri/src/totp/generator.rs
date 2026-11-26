use std::time::{SystemTime, UNIX_EPOCH};

use data_encoding::BASE32;
use totp_rs::{Algorithm, TOTP};

/// Strip all whitespace + uppercase. Every secret entering the vault must go through this.
pub fn sanitize_secret(secret: &str) -> String {
    secret.split_whitespace().collect::<String>().to_uppercase()
}

pub fn generate_code(
    secret: &str,
    algorithm: &str,
    digits: u8,
    period: u32,
) -> Result<(String, u32), String> {
    if period == 0 {
        return Err("Period must be greater than 0".into());
    }
    if !(6..=8).contains(&digits) {
        return Err("Digits must be between 6 and 8".into());
    }

    let clean_secret = sanitize_secret(secret);

    let secret_bytes = BASE32
        .decode(clean_secret.as_bytes())
        .map_err(|e| format!("Invalid Base32 secret: {e}"))?;

    let algo = match algorithm.to_uppercase().as_str() {
        "SHA256" => Algorithm::SHA256,
        "SHA512" => Algorithm::SHA512,
        _ => Algorithm::SHA1,
    };

    // new_unchecked: totp-rs enforces RFC 6238's 128-bit minimum secret,
    // but many services (e.g. GitHub) issue 80-bit seeds. An authenticator
    // must accept whatever the service issued — HMAC handles any key length.
    let totp = TOTP::new_unchecked(
        algo,
        digits as usize,
        1,
        period as u64,
        secret_bytes,
        None,
        String::new(),
    );

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("System time error: {e}"))?
        .as_secs();

    let code = totp.generate(now);
    let seconds_remaining = period - (now % period as u64) as u32;

    Ok((code, seconds_remaining))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_code_valid() {
        // RFC 6238 / RFC 4226 test vector: secret "12345678901234567890" in Base32 = GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
        let secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
        let res = generate_code(secret, "SHA1", 6, 30);
        assert!(res.is_ok());
        let (code, remaining) = res.unwrap();
        assert_eq!(code.len(), 6);
        assert!(remaining <= 30);
    }

    #[test]
    fn test_secret_whitespace_sanitization() {
        // Spaces within secret must not fail
        let dirty = "GEZD GNBV GY3T QOJQ GEZD GNBV GY3T QOJQ";
        let res = generate_code(dirty, "SHA1", 6, 30);
        assert!(res.is_ok());
    }

    #[test]
    fn test_invalid_period() {
        let res = generate_code("JBSWY3DPEHPK3PXP", "SHA1", 6, 0);
        assert!(res.is_err());
    }

    #[test]
    fn test_short_secret_80bit() {
        // GitHub-style 10-byte (80-bit) seed — rejected by TOTP::new, must work here
        let res = generate_code("MFRGGZDFMZTWQ2LK", "SHA1", 6, 30);
        assert!(res.is_ok(), "80-bit secret must generate a code");
    }

    #[test]
    fn test_invalid_digits() {
        let res = generate_code("JBSWY3DPEHPK3PXP", "SHA1", 9, 30);
        assert!(res.is_err());
    }

    #[test]
    fn test_invalid_base32() {
        let res = generate_code("189!invalid", "SHA1", 6, 30);
        assert!(res.is_err());
    }
}
