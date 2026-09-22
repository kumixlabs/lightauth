use std::path::Path;

use image::GrayImage;

use crate::import::migration::parse_migration_uri;
use crate::import::uri::parse_otpauth_uri;
use crate::vault::types::AccountInput;

/// Decode a QR code image file.
/// Supports both standard `otpauth://totp/...` (single account)
/// and Google Authenticator `otpauth-migration://offline?data=...` (multiple accounts).
///
/// Uses a fallback chain of image preprocessing strategies to handle
/// low-quality photos (e.g. screenshots from phones):
/// 1. Raw grayscale
/// 2. 2× nearest-neighbor upscale
/// 3. 3× Lanczos upscale (best quality, slower)
pub fn decode_qr_image(path: &Path) -> Result<Vec<AccountInput>, String> {
    let img = image::open(path)
        .map_err(|e| format!("Failed to open image: {e}"))?;

    let (w, h) = (img.width(), img.height());
    let luma = img.to_luma8();

    // ponytail: if this grows past ~4 strategies, switch to a config-driven loop
    let strategies: Vec<(&str, Box<dyn Fn() -> GrayImage>)> = vec![
        ("raw", Box::new({
            let l = luma.clone();
            move || l.clone()
        })),
        ("2x", Box::new({
            let i = img.clone();
            move || i.resize_exact(w * 2, h * 2, image::imageops::FilterType::Nearest).to_luma8()
        })),
        ("3x", Box::new({
            let i = img.clone();
            move || i.resize(w * 3, h * 3, image::imageops::FilterType::Lanczos3).to_luma8()
        })),
    ];

    for (label, make_img) in &strategies {
        let gray = make_img();
        if let Some(content) = try_decode_qr(&gray) {
            log::debug!("QR decoded with strategy: {label}");
            return parse_qr_content(&content);
        }
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
