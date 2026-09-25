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
/// 1. Raw grayscale
/// 2. 2× nearest-neighbor upscale (fast)
/// 3. 3× Lanczos upscale (high quality, fallback)
pub fn decode_qr_image(path: &Path) -> Result<Vec<AccountInput>, String> {
    let img = image::open(path)
        .map_err(|e| format!("Failed to open image: {e}"))?;

    let luma = img.to_luma8();
    if let Some(content) = try_decode_qr(&luma) {
        return parse_qr_content(&content);
    }

    let (w, h) = (img.width(), img.height());
    let upscale_2x = img.resize_exact(w * 2, h * 2, image::imageops::FilterType::Nearest).to_luma8();
    if let Some(content) = try_decode_qr(&upscale_2x) {
        return parse_qr_content(&content);
    }

    let upscale_3x = img.resize(w * 3, h * 3, image::imageops::FilterType::Lanczos3).to_luma8();
    if let Some(content) = try_decode_qr(&upscale_3x) {
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

fn parse_qr_content(content: &str) -> Result<Vec<AccountInput>, String> {
    if content.starts_with("otpauth-migration://") {
        parse_migration_uri(content)
    } else {
        parse_otpauth_uri(content).map(|a| vec![a])
    }
}
