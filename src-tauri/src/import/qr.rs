use std::path::Path;

use crate::import::migration::parse_migration_uri;
use crate::import::uri::parse_otpauth_uri;
use crate::vault::types::AccountInput;

/// Decode a QR code image file.
/// Supports both standard `otpauth://totp/...` (single account)
/// and Google Authenticator `otpauth-migration://offline?data=...` (multiple accounts).
pub fn decode_qr_image(path: &Path) -> Result<Vec<AccountInput>, String> {
    let img = image::open(path)
        .map_err(|e| format!("Failed to open image: {e}"))?
        .to_luma8();

    let mut prepared = rqrr::PreparedImage::prepare(img);
    let grids = prepared.detect_grids();

    if grids.is_empty() {
        return Err("No QR code found in image".into());
    }

    let (_, content) = grids[0]
        .decode()
        .map_err(|e| format!("Failed to decode QR: {e}"))?;

    if content.starts_with("otpauth-migration://") {
        parse_migration_uri(&content)
    } else {
        parse_otpauth_uri(&content).map(|a| vec![a])
    }
}
