use std::fs;
use std::path::Path;

/// Resolves and reads local .lrc lyrics for an audio track.
/// Matches a file with the same stem and .lrc extension (case-insensitive) in the same directory.
pub fn find_and_read_lrc(track_file_path: &str) -> Option<String> {
    let path = Path::new(track_file_path);
    let parent = path.parent()?;
    let stem = path.file_stem()?.to_string_lossy().to_lowercase();

    // Read directory entries
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
        let mut text = String::from_utf8_lossy(&bytes).to_string();
        if text.starts_with('\u{feff}') {
            text.remove(0);
        }
        return Some(text);
    }
    None
}
