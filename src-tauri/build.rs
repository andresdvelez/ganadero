use std::env;
use std::fs::{create_dir_all, File};
use std::io::Write;
use std::path::PathBuf;

fn ensure_min_icon() {
  let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".into());
  let icons_dir = PathBuf::from(&manifest_dir).join("icons");
  let icon_path = icons_dir.join("icon.png");
  if icon_path.exists() {
    return;
  }
  let _ = create_dir_all(&icons_dir);
  // 1x1 PNG transparente (68 bytes)
  let hex = "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C6360000002000100FFFF03000006000557BF0000000049454E44AE426082";
  let mut bytes = Vec::with_capacity(hex.len() / 2);
  let mut chars = hex.as_bytes().chunks(2);
  while let Some(pair) = chars.next() {
    if pair.len() == 2 {
      let hi = (pair[0] as char).to_digit(16).unwrap_or(0);
      let lo = (pair[1] as char).to_digit(16).unwrap_or(0);
      bytes.push(((hi << 4) | lo) as u8);
    }
  }
  if let Ok(mut f) = File::create(&icon_path) {
    let _ = f.write_all(&bytes);
  }
}

fn main() {
  ensure_min_icon();
  tauri_build::build();
} 