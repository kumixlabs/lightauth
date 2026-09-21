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

    let secret_bytes = BASE32
        .decode(secret.trim().to_uppercase().as_bytes())
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
