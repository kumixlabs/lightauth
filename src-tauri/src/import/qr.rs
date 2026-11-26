use std::path::Path;

use image::GrayImage;

use crate::import::migration::parse_migration_uri;
use crate::import::uri::parse_otpauth_uri;
use crate::vault::types::AccountInput;

/// Decode a QR code image file.
/// Supports both standard `otpauth://totp/...` (single account)
/// and Google Authenticator `otpauth-migration://offline?data=...` (multiple accounts).
///
/// Uses sequential image preprocessing to handle low-quality photos:
/// 1. Raw grayscale (rqrr)
/// 2. 2× nearest-neighbor upscale (rqrr)
/// 3. 3× Lanczos upscale (rqrr)
/// 4. quircs on raw + 2× — handles perspective distortion in phone photos
pub fn decode_qr_image(path: &Path) -> Result<Vec<AccountInput>, String> {
    let img = image::open(path).map_err(|e| format!("Failed to open image: {e}"))?;

    let luma = img.to_luma8();
    if let Some(content) = try_decode_qr(&luma) {
        return parse_qr_content(&content);
    }

    let (w, h) = (img.width(), img.height());
    let upscale_2x = img
        .resize_exact(w * 2, h * 2, image::imageops::FilterType::Nearest)
        .to_luma8();
    if let Some(content) = try_decode_qr(&upscale_2x) {
        return parse_qr_content(&content);
    }

    let upscale_3x = img
        .resize(w * 3, h * 3, image::imageops::FilterType::Lanczos3)
        .to_luma8();
    if let Some(content) = try_decode_qr(&upscale_3x) {
        return parse_qr_content(&content);
    }

    // Last resort: quircs does per-grid perspective correction, which rescues
    // angled/blurry phone photos that rqrr cannot detect at all.
    if let Some(content) = quircs_decode(&luma).or_else(|| quircs_decode(&upscale_2x)) {
        return parse_qr_content(&content);
    }

    Err("Could not decode QR code from image. Try a clearer photo with good lighting.".into())
}

fn try_decode_qr(luma: &GrayImage) -> Option<String> {
    let mut prepared = rqrr::PreparedImage::prepare(luma.clone());
    let grids = prepared.detect_grids();
    if grids.is_empty() {
        return None;
    }
    grids[0].decode().ok().map(|(_, content)| content)
}

/// Decode via quircs (perspective-correcting decoder).
fn quircs_decode(luma: &GrayImage) -> Option<String> {
    let mut decoder = quircs::Quirc::default();
    let codes = decoder.identify(luma.width() as usize, luma.height() as usize, luma.as_raw());
    codes.flatten().find_map(|code| {
        code.decode()
            .ok()
            .map(|d| String::from_utf8_lossy(&d.payload).to_string())
    })
}

fn parse_qr_content(content: &str) -> Result<Vec<AccountInput>, String> {
    if content.starts_with("otpauth-migration://") {
        parse_migration_uri(content)
    } else {
        parse_otpauth_uri(content).map(|a| vec![a])
    }
}
