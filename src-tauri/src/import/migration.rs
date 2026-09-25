use data_encoding::BASE32;

use crate::vault::types::AccountInput;

/// Parse Google Authenticator `otpauth-migration://offline?data=...` URI.
/// Returns a list of AccountInput (one per OTP entry in the protobuf payload).
pub fn parse_migration_uri(uri: &str) -> Result<Vec<AccountInput>, String> {
    let uri = uri.trim();
    if !uri.starts_with("otpauth-migration://") {
        return Err("Not an otpauth-migration URI".into());
    }

    let data_param = uri
        .split('?')
        .nth(1)
        .and_then(|q| {
            q.split('&').find_map(|kv| {
                let (k, v) = kv.split_once('=')?;
                if k == "data" { Some(v) } else { None }
            })
        })
        .ok_or("Missing 'data' parameter")?;

    // URL-decode then base64-decode
    let decoded_param = urlencoding::decode(data_param)
        .map_err(|e| format!("URL decode error: {e}"))?;

    let payload = base64_decode(&decoded_param)?;
    parse_migration_payload(&payload)
}

fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    // Standard base64 with padding
    use data_encoding::BASE64;
    // Google sometimes omits padding, so add it
    let padded = match input.len() % 4 {
        2 => format!("{input}=="),
        3 => format!("{input}="),
        _ => input.to_string(),
    };
    BASE64.decode(padded.as_bytes()).map_err(|e| format!("Base64 decode error: {e}"))
}

/// Manual protobuf decoder for Google Authenticator MigrationPayload.
/// Field 1 (repeated, length-delimited) = OtpParameters messages.
fn parse_migration_payload(data: &[u8]) -> Result<Vec<AccountInput>, String> {
    let mut accounts = Vec::new();
    let mut pos = 0;

    while pos < data.len() {
        let (field_number, wire_type, new_pos) = read_tag(data, pos)?;
        pos = new_pos;

        if field_number == 1 && wire_type == 2 {
            // length-delimited: OtpParameters sub-message
            let (len, new_pos) = read_varint(data, pos)?;
            pos = new_pos;
            let end = pos + len as usize;
            if end > data.len() {
                return Err("Truncated protobuf".into());
            }
            if let Ok(input) = parse_otp_parameters(&data[pos..end]) {
                accounts.push(input);
            }
            pos = end;
        } else {
            pos = skip_field(data, pos, wire_type)?;
        }
    }

    if accounts.is_empty() {
        return Err("No valid OTP entries found in migration data".into());
    }

    Ok(accounts)
}

fn parse_otp_parameters(data: &[u8]) -> Result<AccountInput, String> {
    let mut secret_bytes: Option<Vec<u8>> = None;
    let mut name = String::new();
    let mut issuer = String::new();
    let mut algorithm_val: u64 = 0;
    let mut digits_val: u64 = 0;
    let mut otp_type: u64 = 0;

    let mut pos = 0;
    while pos < data.len() {
        let (field_number, wire_type, new_pos) = read_tag(data, pos)?;
        pos = new_pos;

        match (field_number, wire_type) {
            (1, 2) => {
                // secret (bytes, length-delimited)
                let (len, new_pos) = read_varint(data, pos)?;
                pos = new_pos;
                let end = pos + len as usize;
                secret_bytes = Some(data[pos..end].to_vec());
                pos = end;
            }
            (2, 2) => {
                // name (string)
                let (len, new_pos) = read_varint(data, pos)?;
                pos = new_pos;
                let end = pos + len as usize;
                name = String::from_utf8_lossy(&data[pos..end]).to_string();
                pos = end;
            }
            (3, 2) => {
                // issuer (string)
                let (len, new_pos) = read_varint(data, pos)?;
                pos = new_pos;
                let end = pos + len as usize;
                issuer = String::from_utf8_lossy(&data[pos..end]).to_string();
                pos = end;
            }
            (4, 0) => {
                // algorithm (varint enum)
                let (val, new_pos) = read_varint(data, pos)?;
                algorithm_val = val;
                pos = new_pos;
            }
            (5, 0) => {
                // digits (varint enum)
                let (val, new_pos) = read_varint(data, pos)?;
                digits_val = val;
                pos = new_pos;
            }
            (6, 0) => {
                // type (varint enum)
                let (val, new_pos) = read_varint(data, pos)?;
                otp_type = val;
                pos = new_pos;
            }
            _ => {
                pos = skip_field(data, pos, wire_type)?;
            }
        }
    }

    // Only TOTP (type=2) or unspecified (type=0, treat as TOTP)
    if otp_type == 1 {
        return Err("HOTP not supported".into());
    }

    let raw_secret = secret_bytes.ok_or("Missing secret")?;
    let secret = BASE32.encode(&raw_secret);

    // Parse issuer from name if not set (format: "issuer:account")
    let (parsed_issuer, account) = if let Some(idx) = name.find(':') {
        (name[..idx].to_string(), name[idx + 1..].trim().to_string())
    } else {
        (String::new(), name)
    };

    let final_issuer = if issuer.is_empty() { parsed_issuer } else { issuer };

    let algorithm = match algorithm_val {
        0 | 1 => "SHA1",
        2 => "SHA256",
        3 => "SHA512",
        4 => "MD5",
        _ => "SHA1",
    }.to_string();

    let digits = match digits_val {
        2 => 8,
        _ => 6, // 0=unspec and 1=SIX both default to 6
    };

    Ok(AccountInput {
        issuer: final_issuer,
        account,
        secret,
        algorithm,
        digits,
        period: 30,
    })
}

/// Read a protobuf varint, return (value, new_position).
fn read_varint(data: &[u8], pos: usize) -> Result<(u64, usize), String> {
    let mut result: u64 = 0;
    let mut shift = 0;
    let mut i = pos;
    loop {
        if i >= data.len() {
            return Err("Unexpected end of varint".into());
        }
        let byte = data[i];
        result |= ((byte & 0x7F) as u64) << shift;
        i += 1;
        if byte & 0x80 == 0 {
            return Ok((result, i));
        }
        shift += 7;
        if shift >= 64 {
            return Err("Varint too long".into());
        }
    }
}

/// Read a protobuf tag, return (field_number, wire_type, new_position).
fn read_tag(data: &[u8], pos: usize) -> Result<(u64, u8, usize), String> {
    let (tag, new_pos) = read_varint(data, pos)?;
    let field_number = tag >> 3;
    let wire_type = (tag & 0x07) as u8;
    Ok((field_number, wire_type, new_pos))
}

/// Skip an unknown field.
fn skip_field(data: &[u8], pos: usize, wire_type: u8) -> Result<usize, String> {
    match wire_type {
        0 => {
            // varint
            let (_, new_pos) = read_varint(data, pos)?;
            Ok(new_pos)
        }
        1 => {
            // 64-bit
            Ok(pos + 8)
        }
        2 => {
            // length-delimited
            let (len, new_pos) = read_varint(data, pos)?;
            Ok(new_pos + len as usize)
        }
        5 => {
            // 32-bit
            Ok(pos + 4)
        }
        _ => Err(format!("Unknown wire type {wire_type}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_invalid_scheme() {
        assert!(parse_migration_uri("otpauth://totp/foo").is_err());
    }

    #[test]
    fn test_missing_data_param() {
        assert!(parse_migration_uri("otpauth-migration://offline?foo=bar").is_err());
    }

    #[test]
    fn test_invalid_base64() {
        assert!(parse_migration_uri("otpauth-migration://offline?data=!!!invalid").is_err());
    }
}
