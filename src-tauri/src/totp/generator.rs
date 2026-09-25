use std::time::{SystemTime, UNIX_EPOCH};

use data_encoding::BASE32;
use totp_rs::{Algorithm, TOTP};

pub fn generate_code(
    secret: &str,
    algorithm: &str,
    digits: u8,
    period: u32,
) -> Result<(String, u32), String> {
    if period == 0 {
        return Err("Period must be greater than 0".into());
    }

    let clean_secret: String = secret
        .chars()
        .filter(|c| !c.is_whitespace())
        .collect::<String>()
        .to_uppercase();

    let secret_bytes = BASE32
        .decode(clean_secret.as_bytes())
        .map_err(|e| format!("Invalid Base32 secret: {e}"))?;

    let algo = match algorithm.to_uppercase().as_str() {
        "SHA256" => Algorithm::SHA256,
        "SHA512" => Algorithm::SHA512,
        _ => Algorithm::SHA1,
    };

    let totp = TOTP::new(algo, digits as usize, 1, period as u64, secret_bytes, None, String::new())
        .map_err(|e| format!("TOTP init error: {e}"))?;

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
    fn test_invalid_base32() {
        let res = generate_code("189!invalid", "SHA1", 6, 30);
        assert!(res.is_err());
    }
}
