use std::path::Path;

use crate::vault::types::AccountInput;
use crate::import::uri::parse_otpauth_uri;

/// Decode a QR code image file and parse the otpauth:// URI from it.
pub fn decode_qr_image(path: &Path) -> Result<AccountInput, String> {
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

    parse_otpauth_uri(&content)
}
