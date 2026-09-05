use std::fs;
use std::path::Path;

/// Resolves and reads local .lrc lyrics for an audio track.
/// Matches a file with the same stem and .lrc extension (case-insensitive) in the same directory.
pub fn find_and_read_lrc(track_file_path: &str) -> Option<String> {
    let clean_path = track_file_path.trim().trim_matches('"');
    let path = Path::new(clean_path);

    // Direct fast-path check: same directory and stem with .lrc extension
    let direct_lrc = path.with_extension("lrc");
    if direct_lrc.is_file() {
        if let Some(text) = read_lrc_file(&direct_lrc) {
            return Some(text);
        }
    }

    let parent = path.parent()?;
    let stem = path.file_stem()?.to_string_lossy().to_lowercase();

    // Read directory entries for case-insensitive / suffix matches
    let entries = fs::read_dir(parent).ok()?;

    let mut fallback_match: Option<std::path::PathBuf> = None;

    for entry in entries.flatten() {
        let entry_path = entry.path();
        if entry_path.is_file() {
            if let Some(ext) = entry_path.extension() {
                if ext.to_string_lossy().eq_ignore_ascii_case("lrc") {
                    if let Some(entry_stem) = entry_path.file_stem() {
                        let entry_stem_lower = entry_stem.to_string_lossy().to_lowercase();
                        if entry_stem_lower == stem {
                            // Exact stem match: highest priority, return immediately
                            return read_lrc_file(&entry_path);
                        } else if entry_stem_lower == format!("{}_private", stem)
                            || entry_stem_lower.starts_with(&format!("{}_", stem))
                            || entry_stem_lower.starts_with(&format!("{}.", stem))
                        {
                            // Safe suffix match with explicit separator
                            if fallback_match.is_none() {
                                fallback_match = Some(entry_path);
                            }
                        }
                    }
                }
            }
        }
    }

    if let Some(path) = fallback_match {
        return read_lrc_file(&path);
    }

    None
}

fn read_lrc_file(path: &Path) -> Option<String> {
    if let Ok(bytes) = fs::read(path) {
        if bytes.is_empty() {
            return None;
        }
        // Handle UTF-16LE with BOM
        if bytes.len() >= 2 && bytes[0] == 0xff && bytes[1] == 0xfe {
            let u16_chars: Vec<u16> = bytes[2..]
                .chunks_exact(2)
                .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
                .collect();
            return Some(String::from_utf16_lossy(&u16_chars));
        }
        // Handle UTF-16BE with BOM
        if bytes.len() >= 2 && bytes[0] == 0xfe && bytes[1] == 0xff {
            let u16_chars: Vec<u16> = bytes[2..]
                .chunks_exact(2)
                .map(|chunk| u16::from_be_bytes([chunk[0], chunk[1]]))
                .collect();
            return Some(String::from_utf16_lossy(&u16_chars));
        }
        let mut text = String::from_utf8_lossy(&bytes).to_string();
        if text.starts_with('\u{feff}') {
            text.remove(0);
        }
        return Some(text);
    }
    None
}
