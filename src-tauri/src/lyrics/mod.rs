use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

/// Model for lyric file source fingerprint used for conflict and external modification detection.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LyricsSourceFingerprint {
    pub algorithm: String,
    pub value: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_time_milliseconds: Option<u64>,
}

/// Result of resolving and reading a lyric sidecar file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ResolvedLyrics {
    pub file_path: String,
    pub content: String,
}

/// Candidate priority tiers for deterministic lyric resolution.
/// Lower numerical value indicates higher resolution priority.
///
/// Priority Order:
/// 1. ExactStemExactCase: Exact stem and exact lowercase "lrc" extension (e.g. "Song.lrc" for "Song.mp3")
/// 2. ExactStemCaseInsensitive: Case-insensitive stem and extension match (e.g. "song.LRC" for "Song.mp3")
/// 3. PrivateExactCase: Exact case "{stem}_private.lrc"
/// 4. PrivateCaseInsensitive: Case-insensitive "{stem}_private.lrc"
/// 5. UnderscoreSuffix: "{stem}_{suffix}.lrc" (excluding "_private")
/// 6. DotSuffix: "{stem}.{suffix}.lrc"
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum CandidateTier {
    ExactStemExactCase = 0,
    ExactStemCaseInsensitive = 1,
    PrivateExactCase = 2,
    PrivateCaseInsensitive = 3,
    UnderscoreSuffix = 4,
    DotSuffix = 5,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct LyricCandidate {
    tier: CandidateTier,
    file_name_lower: String,
    file_name: String,
    path: PathBuf,
}

/// Resolves the highest-priority matching lyric sidecar file path for an audio track.
///
/// Deterministic Selection Rules:
/// 1. Candidates are ranked strictly by `CandidateTier`.
/// 2. Tie-breaker within the same tier:
///    - Primary: lowercased filename in ascending Unicode/lexicographical order.
///    - Secondary: original filename in ascending ordinal byte order.
/// 3. Filesystem directory iteration order never influences candidate selection.
/// 4. Selection is made solely based on filename matching before attempting to read.
pub fn resolve_lyric_path(track_file_path: &str) -> Option<PathBuf> {
    let clean_path = track_file_path.trim().trim_matches('"');
    let path = Path::new(clean_path);

    let parent = path.parent()?;
    let track_stem = path.file_stem()?.to_string_lossy().to_string();
    let track_stem_lower = track_stem.to_lowercase();

    let entries = match fs::read_dir(parent) {
        Ok(entries) => entries,
        Err(_) => {
            // Fallback for environments where directory listing is unavailable:
            let direct_lrc = path.with_extension("lrc");
            return if direct_lrc.is_file() {
                Some(direct_lrc)
            } else {
                None
            };
        }
    };

    let mut candidates: Vec<LyricCandidate> = Vec::new();

    for entry in entries.flatten() {
        let entry_path = entry.path();
        if !entry_path.is_file() {
            continue;
        }

        let ext = match entry_path.extension() {
            Some(e) => e.to_string_lossy().to_string(),
            None => continue,
        };

        if !ext.eq_ignore_ascii_case("lrc") {
            continue;
        }

        let entry_file_name = match entry_path.file_name() {
            Some(name) => name.to_string_lossy().to_string(),
            None => continue,
        };

        let entry_stem = match entry_path.file_stem() {
            Some(stem) => stem.to_string_lossy().to_string(),
            None => continue,
        };

        let entry_stem_lower = entry_stem.to_lowercase();
        let private_suffix_exact = format!("{}_private", track_stem);
        let private_suffix_lower = format!("{}_private", track_stem_lower);
        let underscore_prefix_lower = format!("{}_", track_stem_lower);
        let dot_prefix_lower = format!("{}.", track_stem_lower);

        let tier = if entry_stem == track_stem && ext == "lrc" {
            CandidateTier::ExactStemExactCase
        } else if entry_stem_lower == track_stem_lower {
            CandidateTier::ExactStemCaseInsensitive
        } else if entry_stem == private_suffix_exact && ext == "lrc" {
            CandidateTier::PrivateExactCase
        } else if entry_stem_lower == private_suffix_lower {
            CandidateTier::PrivateCaseInsensitive
        } else if entry_stem_lower.starts_with(&underscore_prefix_lower) {
            CandidateTier::UnderscoreSuffix
        } else if entry_stem_lower.starts_with(&dot_prefix_lower) {
            CandidateTier::DotSuffix
        } else {
            continue;
        };

        candidates.push(LyricCandidate {
            tier,
            file_name_lower: entry_file_name.to_lowercase(),
            file_name: entry_file_name,
            path: entry_path,
        });
    }

    if candidates.is_empty() {
        return None;
    }

    // Deterministic sort: tier asc, then file_name_lower asc, then file_name asc
    candidates.sort_by(|a, b| {
        a.tier
            .cmp(&b.tier)
            .then_with(|| a.file_name_lower.cmp(&b.file_name_lower))
            .then_with(|| a.file_name.cmp(&b.file_name))
    });

    candidates.first().map(|c| c.path.clone())
}

/// Resolves and reads local .lrc lyrics for an audio track.
///
/// Returns:
/// - `Ok(None)` if no matching lyric file exists.
/// - `Ok(Some(ResolvedLyrics))` if the highest-priority matching file was found and read.
/// - `Err(String)` if the highest-priority matching file was selected but could not be read.
pub fn find_and_read_lrc(track_file_path: &str) -> Result<Option<ResolvedLyrics>, String> {
    let resolved_path = match resolve_lyric_path(track_file_path) {
        Some(path) => path,
        None => return Ok(None),
    };

    let content = read_lrc_file(&resolved_path)?;
    Ok(Some(ResolvedLyrics {
        file_path: resolved_path.to_string_lossy().to_string(),
        content,
    }))
}

/// Reads and decodes a lyric file with support for:
/// - UTF-8
/// - UTF-8 with BOM
/// - UTF-16LE with BOM
/// - UTF-16BE with BOM
/// - Empty files (returns empty string)
pub fn read_lrc_file(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("Failed to read lyric file '{}': {}", path.display(), e))?;

    if bytes.is_empty() {
        return Ok(String::new());
    }

    // Handle UTF-16LE with BOM (0xFF, 0xFE)
    if bytes.len() >= 2 && bytes[0] == 0xff && bytes[1] == 0xfe {
        let u16_chars: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
            .collect();
        return Ok(String::from_utf16_lossy(&u16_chars));
    }

    // Handle UTF-16BE with BOM (0xFE, 0xFF)
    if bytes.len() >= 2 && bytes[0] == 0xfe && bytes[1] == 0xff {
        let u16_chars: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|chunk| u16::from_be_bytes([chunk[0], chunk[1]]))
            .collect();
        return Ok(String::from_utf16_lossy(&u16_chars));
    }

    // Handle UTF-8 (with or without BOM)
    let mut text = String::from_utf8_lossy(&bytes).to_string();
    if text.starts_with('\u{feff}') {
        text.remove(0);
    }
    Ok(text)
}

/// Computes the cryptographic and filesystem fingerprint for a file at `path`.
pub fn compute_file_fingerprint(path: &Path) -> Result<LyricsSourceFingerprint, String> {
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read metadata for '{}': {}", path.display(), e))?;
    let bytes = fs::read(path)
        .map_err(|e| format!("Failed to read file '{}': {}", path.display(), e))?;

    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let hash = hex::encode(hasher.finalize());

    let size_bytes = metadata.len();
    let modified_time_milliseconds = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64);

    Ok(LyricsSourceFingerprint {
        algorithm: "sha256".to_string(),
        value: hash,
        size_bytes: Some(size_bytes),
        modified_time_milliseconds,
    })
}

/// Encodes serialized LRC text content into raw bytes according to requested encoding.
/// Supports:
/// - utf-8: standard UTF-8 without BOM
/// - utf-8-bom: UTF-8 with leading EF BB BF
/// - utf-16le: UTF-16 little-endian without BOM
/// - utf-16be: UTF-16 big-endian without BOM
/// Rejects unknown or unsupported encodings without guessing.
pub fn encode_lyrics_content(content: &str, encoding: &str) -> Result<Vec<u8>, String> {
    let enc = encoding.trim().to_lowercase();
    match enc.as_str() {
        "utf-8" => Ok(content.as_bytes().to_vec()),
        "utf-8-bom" => {
            let mut bytes = Vec::with_capacity(3 + content.len());
            bytes.extend_from_slice(&[0xEF, 0xBB, 0xBF]);
            bytes.extend_from_slice(content.as_bytes());
            Ok(bytes)
        }
        "utf-16le" => {
            let mut bytes = Vec::with_capacity(content.len() * 2);
            for code_unit in content.encode_utf16() {
                bytes.extend_from_slice(&code_unit.to_le_bytes());
            }
            Ok(bytes)
        }
        "utf-16be" => {
            let mut bytes = Vec::with_capacity(content.len() * 2);
            for code_unit in content.encode_utf16() {
                bytes.extend_from_slice(&code_unit.to_be_bytes());
            }
            Ok(bytes)
        }
        _ => Err(format!("Unsupported or unknown encoding: '{}'", encoding)),
    }
}

/// Verifies that the existing file on disk matches the expected fingerprint.
///
/// Note on TOCTOU (time-of-check to time-of-use):
/// The fingerprint check provides conflict detection before initiating the save sequence.
/// However, like any user-space filesystem operation, it cannot strictly eliminate a TOCTOU
/// race condition if an external process modifies the file in the microsecond window between
/// verification and atomic replacement. The save layer minimizes this window by performing
/// verification immediately before the atomic file swap.
pub fn verify_fingerprint(path: &Path, expected: &LyricsSourceFingerprint) -> Result<(), String> {
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read metadata for '{}': {}", path.display(), e))?;
    let bytes = fs::read(path)
        .map_err(|e| format!("Failed to read file '{}': {}", path.display(), e))?;

    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let current_sha256 = hex::encode(hasher.finalize());

    let current_size = metadata.len();
    let current_mtime = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64);

    if expected.algorithm.eq_ignore_ascii_case("sha256") {
        if !current_sha256.eq_ignore_ascii_case(&expected.value) {
            return Err(format!(
                "Source file modified externally: expected SHA-256 '{}', found '{}'",
                expected.value, current_sha256
            ));
        }
        if let Some(expected_size) = expected.size_bytes {
            if current_size != expected_size {
                return Err(format!(
                    "Source file modified externally: expected size {} bytes, found {} bytes",
                    expected_size, current_size
                ));
            }
        }
    } else if expected.algorithm.eq_ignore_ascii_case("size-mtime") {
        if let Some(expected_size) = expected.size_bytes {
            if current_size != expected_size {
                return Err(format!(
                    "Source file modified externally: expected size {} bytes, found {} bytes",
                    expected_size, current_size
                ));
            }
        }
        if let Some(expected_mtime) = expected.modified_time_milliseconds {
            if let Some(actual_mtime) = current_mtime {
                if actual_mtime != expected_mtime {
                    return Err(format!(
                        "Source file modified externally: expected modified time {}, found {}",
                        expected_mtime, actual_mtime
                    ));
                }
            }
        }
        let expected_val = format!("{}:{}", current_size, current_mtime.unwrap_or(0));
        if !expected.value.is_empty()
            && expected.value != expected_val
            && !expected.value.eq_ignore_ascii_case(&current_sha256)
        {
            return Err(format!(
                "Source file modified externally: fingerprint value mismatch for algorithm '{}'",
                expected.algorithm
            ));
        }
    } else {
        if !expected.value.is_empty() && !expected.value.eq_ignore_ascii_case(&current_sha256) {
            return Err(format!(
                "Source file modified externally: expected fingerprint '{}', found '{}'",
                expected.value, current_sha256
            ));
        }
    }

    Ok(())
}

/// Fallback replacement strategy using a temporary backup with rollback.
/// Used on Windows when ReplaceFileW is not supported by the underlying filesystem (e.g. FAT32/exFAT).
fn safe_backup_and_swap(temp_path: &Path, target_path: &Path) -> Result<(), String> {
    let parent = target_path.parent().unwrap_or_else(|| Path::new("."));
    let backup_name = format!(
        ".{}.{}_{}.bak",
        target_path.file_name().and_then(|n| n.to_str()).unwrap_or("lyrics"),
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    );
    let backup_path = parent.join(backup_name);

    // 1. Move target to backup
    fs::rename(target_path, &backup_path).map_err(|e| {
        format!(
            "Fallback replacement failed to rename original to backup: {}",
            e
        )
    })?;

    // 2. Move temp to target
    if let Err(e) = fs::rename(temp_path, target_path) {
        // Rollback: try to restore original from backup
        let _ = fs::rename(&backup_path, target_path);
        return Err(format!(
            "Fallback replacement failed to move temp file into place (restored backup): {}",
            e
        ));
    }

    // 3. Remove backup
    let _ = fs::remove_file(&backup_path);
    Ok(())
}

#[cfg(windows)]
fn win32_replace_file(temp_path: &Path, target_path: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;

    #[link(name = "kernel32")]
    extern "system" {
        fn ReplaceFileW(
            lpReplacedFileName: *const u16,
            lpReplacementFileName: *const u16,
            lpBackupFileName: *const u16,
            dwReplaceFlags: u32,
            lpExclude: *mut std::ffi::c_void,
            lpReserved: *mut std::ffi::c_void,
        ) -> i32;
    }

    let target_wide: Vec<u16> = target_path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let temp_wide: Vec<u16> = temp_path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    // In ReplaceFileW:
    // lpReplacedFileName = target_path (the file being replaced)
    // lpReplacementFileName = temp_path (the new file)
    let success = unsafe {
        ReplaceFileW(
            target_wide.as_ptr(),
            temp_wide.as_ptr(),
            std::ptr::null(),
            0,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        )
    };

    if success != 0 {
        return Ok(());
    }

    let os_err = std::io::Error::last_os_error();
    let raw_code = os_err.raw_os_error().unwrap_or(0);

    // If ReplaceFileW returns ERROR_INVALID_FUNCTION (1) or ERROR_NOT_SUPPORTED (50),
    // fall back to safe backup-and-swap with rollback.
    if raw_code == 1 || raw_code == 50 {
        return safe_backup_and_swap(temp_path, target_path);
    }

    Err(format!(
        "Failed to replace '{}' with '{}' via ReplaceFileW: {}",
        target_path.display(),
        temp_path.display(),
        os_err
    ))
}

/// Replaces target_path with temp_path atomically.
///
/// On Windows:
/// Uses Win32 `ReplaceFileW`, which is Microsoft's canonical atomic file replacement API.
/// If `ReplaceFileW` is not supported on the underlying filesystem (e.g. non-NTFS like FAT32/exFAT),
/// it falls back to a safe backup-and-swap mechanism with rollback, never directly overwriting
/// the original file with in-place writes.
///
/// On non-Windows (macOS/Linux):
/// Uses `std::fs::rename`, which POSIX guarantees to replace the destination atomically.
pub fn atomic_replace_file(temp_path: &Path, target_path: &Path) -> Result<(), String> {
    #[cfg(windows)]
    {
        win32_replace_file(temp_path, target_path)
    }
    #[cfg(not(windows))]
    {
        fs::rename(temp_path, target_path).map_err(|e| {
            format!(
                "Failed to replace '{}' with '{}': {}",
                target_path.display(),
                temp_path.display(),
                e
            )
        })
    }
}

/// Saves serialized LRC content to an existing file using atomic replacement and fingerprint conflict detection.
///
/// Execution Sequence:
/// 1. Validates that source_path is provided and non-empty.
/// 2. Validates that the target file exists on disk.
/// 3. Validates that an expected fingerprint is provided (rejects if null/None).
/// 4. Validates requested encoding (rejects unknown/unsupported encodings without guessing).
/// 5. Encodes serialized text to bytes.
/// 6. Verifies current file against expected fingerprint.
/// 7. Creates a unique temporary file in the SAME directory as the source file.
/// 8. Writes all encoded bytes and flushes (sync_all).
/// 9. Drops the file handle to release any open locks before replacement.
/// 10. Replaces the original with the temporary file atomically (ReplaceFileW on Windows, rename on POSIX).
/// 11. Cleans up temporary file if any step fails; the original file remains untouched.
/// 12. Returns the fresh LyricsSourceFingerprint for the newly saved file.
pub fn save_lrc_file(
    source_path: &str,
    content: &str,
    encoding: &str,
    expected_fingerprint: Option<&LyricsSourceFingerprint>,
) -> Result<LyricsSourceFingerprint, String> {
    let clean_path = source_path.trim().trim_matches('"');
    if clean_path.is_empty() {
        return Err("Missing source path: cannot save a document without an existing file path".to_string());
    }

    let target_path = Path::new(clean_path);
    if !target_path.is_file() {
        return Err(format!("Source file does not exist: '{}'", target_path.display()));
    }

    let expected = expected_fingerprint.ok_or_else(|| {
        "Source fingerprint unavailable: cannot verify file state before saving".to_string()
    })?;

    // Validate encoding and encode content before touching filesystem
    let encoded_bytes = encode_lyrics_content(content, encoding)?;

    // Verify external modification conflict
    verify_fingerprint(target_path, expected)?;

    // Create unique temporary file in the SAME directory
    let parent_dir = target_path.parent().ok_or_else(|| {
        format!(
            "Invalid source path: cannot determine parent directory for '{}'",
            target_path.display()
        )
    })?;

    let file_stem = target_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("lyrics");

    let temp_name = format!(
        ".{}.{}_{}.tmp",
        file_stem,
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    );
    let temp_path = parent_dir.join(temp_name);

    // Write bytes to temp file
    let mut file = fs::File::create(&temp_path).map_err(|e| {
        format!("Failed to create temporary file '{}': {}", temp_path.display(), e)
    })?;

    if let Err(e) = file.write_all(&encoded_bytes) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("Failed to write temporary file '{}': {}", temp_path.display(), e));
    }

    if let Err(e) = file.sync_all() {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("Failed to flush temporary file '{}': {}", temp_path.display(), e));
    }

    // Explicitly drop file handle to ensure it is closed before replacement
    drop(file);

    // Atomically replace target with temp
    if let Err(e) = atomic_replace_file(&temp_path, target_path) {
        let _ = fs::remove_file(&temp_path);
        return Err(e);
    }

    // Compute and return the new fingerprint of the saved file
    compute_file_fingerprint(target_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn create_temp_dir(prefix: &str) -> PathBuf {
        let temp_dir = std::env::temp_dir().join(format!("endurance_{}_{}", prefix, std::process::id()));
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).expect("Create temp dir");
        temp_dir
    }

    // 1. Exact <stem>.lrc match
    #[test]
    fn test_exact_stem_lrc_match() {
        let temp_dir = create_temp_dir("exact_stem");
        let audio = temp_dir.join("track.mp3");
        let lrc = temp_dir.join("track.lrc");
        fs::write(&audio, b"audio").unwrap();
        fs::write(&lrc, b"[00:01.00]Exact stem line").unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap().expect("Should resolve lyrics");
        assert_eq!(res.file_path, lrc.to_string_lossy());
        assert_eq!(res.content, "[00:01.00]Exact stem line");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 2. Case-insensitive matching
    #[test]
    fn test_case_insensitive_match() {
        let temp_dir = create_temp_dir("case_insensitive");
        let audio = temp_dir.join("UPPERCASE_SONG.M4A");
        let lrc = temp_dir.join("uppercase_song.LRC");
        fs::write(&audio, b"audio").unwrap();
        fs::write(&lrc, b"[00:02.00]Case insensitive line").unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap().expect("Should resolve lyrics");
        assert_eq!(res.file_path, lrc.to_string_lossy());
        assert_eq!(res.content, "[00:02.00]Case insensitive line");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 3. _private fallback
    #[test]
    fn test_private_fallback() {
        let temp_dir = create_temp_dir("private_fallback");
        let audio = temp_dir.join("ballad.flac");
        let lrc = temp_dir.join("ballad_private.lrc");
        fs::write(&audio, b"audio").unwrap();
        fs::write(&lrc, b"[00:03.00]Private fallback line").unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap().expect("Should resolve lyrics");
        assert_eq!(res.file_path, lrc.to_string_lossy());
        assert_eq!(res.content, "[00:03.00]Private fallback line");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 4. <stem>_<suffix> fallback
    #[test]
    fn test_underscore_suffix_fallback() {
        let temp_dir = create_temp_dir("underscore_suffix");
        let audio = temp_dir.join("ballad.flac");
        let lrc = temp_dir.join("ballad_instrumental.lrc");
        fs::write(&audio, b"audio").unwrap();
        fs::write(&lrc, b"[00:04.00]Underscore suffix line").unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap().expect("Should resolve lyrics");
        assert_eq!(res.file_path, lrc.to_string_lossy());
        assert_eq!(res.content, "[00:04.00]Underscore suffix line");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 5. <stem>.<suffix> fallback
    #[test]
    fn test_dot_suffix_fallback() {
        let temp_dir = create_temp_dir("dot_suffix");
        let audio = temp_dir.join("ballad.flac");
        let lrc = temp_dir.join("ballad.en.lrc");
        fs::write(&audio, b"audio").unwrap();
        fs::write(&lrc, b"[00:05.00]Dot suffix line").unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap().expect("Should resolve lyrics");
        assert_eq!(res.file_path, lrc.to_string_lossy());
        assert_eq!(res.content, "[00:05.00]Dot suffix line");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 6. Multiple matching fallback candidates with priority order
    #[test]
    fn test_multiple_matching_candidates_priority_order() {
        let temp_dir = create_temp_dir("priority_ladder");
        let audio = temp_dir.join("harmony.mp3");
        let exact_lrc = temp_dir.join("harmony.lrc");
        let private_lrc = temp_dir.join("harmony_private.lrc");
        let underscore_lrc = temp_dir.join("harmony_live.lrc");
        let dot_lrc = temp_dir.join("harmony.eng.lrc");

        fs::write(&audio, b"audio").unwrap();
        fs::write(&exact_lrc, b"[00:01.00]Exact").unwrap();
        fs::write(&private_lrc, b"[00:01.00]Private").unwrap();
        fs::write(&underscore_lrc, b"[00:01.00]Underscore").unwrap();
        fs::write(&dot_lrc, b"[00:01.00]Dot").unwrap();

        // 1. Exact wins over all
        let res1 = find_and_read_lrc(&audio.to_string_lossy()).unwrap().unwrap();
        assert_eq!(res1.file_path, exact_lrc.to_string_lossy());

        // 2. Private wins over underscore and dot
        fs::remove_file(&exact_lrc).unwrap();
        let res2 = find_and_read_lrc(&audio.to_string_lossy()).unwrap().unwrap();
        assert_eq!(res2.file_path, private_lrc.to_string_lossy());

        // 3. Underscore wins over dot
        fs::remove_file(&private_lrc).unwrap();
        let res3 = find_and_read_lrc(&audio.to_string_lossy()).unwrap().unwrap();
        assert_eq!(res3.file_path, underscore_lrc.to_string_lossy());

        // 4. Dot wins when only one left
        fs::remove_file(&underscore_lrc).unwrap();
        let res4 = find_and_read_lrc(&audio.to_string_lossy()).unwrap().unwrap();
        assert_eq!(res4.file_path, dot_lrc.to_string_lossy());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 7. Deterministic selection when multiple candidates exist in same tier
    #[test]
    fn test_deterministic_tie_breaker() {
        let temp_dir = create_temp_dir("tie_breaker");
        let audio = temp_dir.join("rhythm.mp3");

        // Candidates in Tier 3 (underscore suffix):
        // "rhythm_remix.lrc", "rhythm_live.lrc", "rhythm_acoustic.lrc"
        // Alphabetical winner must be "rhythm_acoustic.lrc"
        let acoustic = temp_dir.join("rhythm_acoustic.lrc");
        let live = temp_dir.join("rhythm_live.lrc");
        let remix = temp_dir.join("rhythm_remix.lrc");

        fs::write(&audio, b"audio").unwrap();
        fs::write(&remix, b"remix").unwrap();
        fs::write(&live, b"live").unwrap();
        fs::write(&acoustic, b"acoustic").unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap().unwrap();
        assert_eq!(res.file_path, acoustic.to_string_lossy());
        assert_eq!(res.content, "acoustic");

        // Candidates in Tier 4 (dot suffix):
        // "rhythm.v2.lrc", "rhythm.v1.lrc"
        // Alphabetical winner must be "rhythm.v1.lrc"
        fs::remove_file(&acoustic).unwrap();
        fs::remove_file(&live).unwrap();
        fs::remove_file(&remix).unwrap();

        let dot_v2 = temp_dir.join("rhythm.v2.lrc");
        let dot_v1 = temp_dir.join("rhythm.v1.lrc");
        fs::write(&dot_v2, b"v2").unwrap();
        fs::write(&dot_v1, b"v1").unwrap();

        let res_dot = find_and_read_lrc(&audio.to_string_lossy()).unwrap().unwrap();
        assert_eq!(res_dot.file_path, dot_v1.to_string_lossy());
        assert_eq!(res_dot.content, "v1");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 8. Missing lyric file returns Ok(None)
    #[test]
    fn test_missing_lyric_file() {
        let temp_dir = create_temp_dir("missing");
        let audio = temp_dir.join("solitary.mp3");
        fs::write(&audio, b"audio").unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap();
        assert!(res.is_none());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 9. UTF-8 decoding
    #[test]
    fn test_utf8_encoding() {
        let temp_dir = create_temp_dir("utf8");
        let audio = temp_dir.join("utf8_song.mp3");
        let lrc = temp_dir.join("utf8_song.lrc");
        let text = "[00:10.00]Starlight and dreams: café crème\n";
        fs::write(&audio, b"audio").unwrap();
        fs::write(&lrc, text.as_bytes()).unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap().unwrap();
        assert_eq!(res.content, text);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 10. UTF-8 with BOM
    #[test]
    fn test_utf8_bom_encoding() {
        let temp_dir = create_temp_dir("utf8_bom");
        let audio = temp_dir.join("bom_song.mp3");
        let lrc = temp_dir.join("bom_song.lrc");
        let mut bytes = vec![0xEF, 0xBB, 0xBF];
        bytes.extend_from_slice(b"[00:01.00]BOM line\n");

        fs::write(&audio, b"audio").unwrap();
        fs::write(&lrc, &bytes).unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap().unwrap();
        assert_eq!(res.content, "[00:01.00]BOM line\n");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 11. UTF-16LE decoding
    #[test]
    fn test_utf16le_encoding() {
        let temp_dir = create_temp_dir("utf16le");
        let audio = temp_dir.join("le_song.mp3");
        let lrc = temp_dir.join("le_song.lrc");

        let lyrics_str = "[00:02.00]UTF-16LE line\n";
        let mut bytes: Vec<u8> = vec![0xFF, 0xFE]; // LE BOM
        for u in lyrics_str.encode_utf16() {
            bytes.extend_from_slice(&u.to_le_bytes());
        }

        fs::write(&audio, b"audio").unwrap();
        fs::write(&lrc, &bytes).unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap().unwrap();
        assert_eq!(res.content, lyrics_str);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 12. UTF-16BE decoding
    #[test]
    fn test_utf16be_encoding() {
        let temp_dir = create_temp_dir("utf16be");
        let audio = temp_dir.join("be_song.mp3");
        let lrc = temp_dir.join("be_song.lrc");

        let lyrics_str = "[00:03.00]UTF-16BE line\n";
        let mut bytes: Vec<u8> = vec![0xFE, 0xFF]; // BE BOM
        for u in lyrics_str.encode_utf16() {
            bytes.extend_from_slice(&u.to_be_bytes());
        }

        fs::write(&audio, b"audio").unwrap();
        fs::write(&lrc, &bytes).unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap().unwrap();
        assert_eq!(res.content, lyrics_str);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 13. Returned resolved file path accuracy
    #[test]
    fn test_resolved_file_path_accuracy() {
        let temp_dir = create_temp_dir("path_accuracy");
        let audio = temp_dir.join("precision.mp3");
        let lrc = temp_dir.join("precision_custom.LRC");

        fs::write(&audio, b"audio").unwrap();
        fs::write(&lrc, b"content").unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap().unwrap();
        assert_eq!(res.file_path, lrc.to_string_lossy());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 14. Empty file returns empty content with resolved path (does NOT select a lower priority fallback)
    #[test]
    fn test_empty_file_selected_and_not_fallen_through() {
        let temp_dir = create_temp_dir("empty_candidate");
        let audio = temp_dir.join("blank.mp3");
        let exact_lrc = temp_dir.join("blank.lrc");
        let fallback_lrc = temp_dir.join("blank_private.lrc");

        fs::write(&audio, b"audio").unwrap();
        fs::write(&exact_lrc, b"").unwrap(); // 0 bytes empty higher-priority
        fs::write(&fallback_lrc, b"[00:01.00]Should not be chosen").unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap().expect("Should resolve exact file");
        assert_eq!(res.file_path, exact_lrc.to_string_lossy());
        assert_eq!(res.content, ""); // Content is empty, exact winning file selected

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 15. Broader matching rules are NOT matched
    #[test]
    fn test_no_accidental_broader_matching() {
        let temp_dir = create_temp_dir("no_broad_matching");
        let audio = temp_dir.join("song.mp3");
        let unrelated1 = temp_dir.join("songextra.lrc");
        let unrelated2 = temp_dir.join("songster.lrc");
        let unrelated3 = temp_dir.join("song-remix.lrc");

        fs::write(&audio, b"audio").unwrap();
        fs::write(&unrelated1, b"unrelated1").unwrap();
        fs::write(&unrelated2, b"unrelated2").unwrap();
        fs::write(&unrelated3, b"unrelated3").unwrap();

        let res = find_and_read_lrc(&audio.to_string_lossy()).unwrap();
        assert!(res.is_none(), "Unrelated prefixes must not be resolved as lyrics");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // --- Native Save Tests ---

    #[test]
    fn test_save_utf8_success() {
        let temp_dir = create_temp_dir("save_utf8");
        let lrc_path = temp_dir.join("song.lrc");
        fs::write(&lrc_path, b"[00:01.00]Initial").unwrap();

        let initial_fp = compute_file_fingerprint(&lrc_path).unwrap();
        let new_content = "[00:05.00]New UTF-8 content: \u{266A}\n[00:10.00]Second line";

        let new_fp = save_lrc_file(
            &lrc_path.to_string_lossy(),
            new_content,
            "utf-8",
            Some(&initial_fp),
        )
        .expect("Save should succeed");

        let disk_bytes = fs::read(&lrc_path).unwrap();
        assert_eq!(disk_bytes, new_content.as_bytes());
        assert_ne!(new_fp.value, initial_fp.value);
        assert_eq!(new_fp.algorithm, "sha256");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_save_utf8_bom_success() {
        let temp_dir = create_temp_dir("save_utf8_bom");
        let lrc_path = temp_dir.join("song.lrc");
        fs::write(&lrc_path, b"[00:01.00]Initial").unwrap();

        let initial_fp = compute_file_fingerprint(&lrc_path).unwrap();
        let new_content = "[00:02.00]BOM content";

        let _ = save_lrc_file(
            &lrc_path.to_string_lossy(),
            new_content,
            "utf-8-bom",
            Some(&initial_fp),
        )
        .expect("Save should succeed");

        let disk_bytes = fs::read(&lrc_path).unwrap();
        assert_eq!(&disk_bytes[0..3], &[0xEF, 0xBB, 0xBF]);
        assert_eq!(&disk_bytes[3..], new_content.as_bytes());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_save_utf16le_success() {
        let temp_dir = create_temp_dir("save_utf16le");
        let lrc_path = temp_dir.join("song.lrc");
        fs::write(&lrc_path, b"[00:01.00]Initial").unwrap();

        let initial_fp = compute_file_fingerprint(&lrc_path).unwrap();
        let new_content = "[00:03.00]UTF-16LE \u{1F3B6} melody";

        let _ = save_lrc_file(
            &lrc_path.to_string_lossy(),
            new_content,
            "utf-16le",
            Some(&initial_fp),
        )
        .expect("Save should succeed");

        let disk_bytes = fs::read(&lrc_path).unwrap();
        let mut expected_bytes: Vec<u8> = Vec::new();
        for u in new_content.encode_utf16() {
            expected_bytes.extend_from_slice(&u.to_le_bytes());
        }
        assert_eq!(disk_bytes, expected_bytes);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_save_utf16be_success() {
        let temp_dir = create_temp_dir("save_utf16be");
        let lrc_path = temp_dir.join("song.lrc");
        fs::write(&lrc_path, b"[00:01.00]Initial").unwrap();

        let initial_fp = compute_file_fingerprint(&lrc_path).unwrap();
        let new_content = "[00:04.00]UTF-16BE \u{1F3B6} melody";

        let _ = save_lrc_file(
            &lrc_path.to_string_lossy(),
            new_content,
            "utf-16be",
            Some(&initial_fp),
        )
        .expect("Save should succeed");

        let disk_bytes = fs::read(&lrc_path).unwrap();
        let mut expected_bytes: Vec<u8> = Vec::new();
        for u in new_content.encode_utf16() {
            expected_bytes.extend_from_slice(&u.to_be_bytes());
        }
        assert_eq!(disk_bytes, expected_bytes);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_save_missing_source_path() {
        let err = save_lrc_file("", "content", "utf-8", None).unwrap_err();
        assert!(err.contains("Missing source path"));

        let err_ws = save_lrc_file("   ", "content", "utf-8", None).unwrap_err();
        assert!(err_ws.contains("Missing source path"));
    }

    #[test]
    fn test_save_nonexistent_source_file() {
        let temp_dir = create_temp_dir("save_nonexistent");
        let missing_path = temp_dir.join("nonexistent.lrc");
        let fake_fp = LyricsSourceFingerprint {
            algorithm: "sha256".to_string(),
            value: "abc".to_string(),
            size_bytes: Some(10),
            modified_time_milliseconds: Some(100),
        };

        let err = save_lrc_file(
            &missing_path.to_string_lossy(),
            "content",
            "utf-8",
            Some(&fake_fp),
        )
        .unwrap_err();
        assert!(err.contains("Source file does not exist"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_save_unknown_encoding_rejected() {
        let temp_dir = create_temp_dir("save_unknown_enc");
        let lrc_path = temp_dir.join("song.lrc");
        fs::write(&lrc_path, b"Initial").unwrap();
        let fp = compute_file_fingerprint(&lrc_path).unwrap();

        let err = save_lrc_file(
            &lrc_path.to_string_lossy(),
            "content",
            "unknown",
            Some(&fp),
        )
        .unwrap_err();
        assert!(err.contains("Unsupported or unknown encoding"));

        let err2 = save_lrc_file(
            &lrc_path.to_string_lossy(),
            "content",
            "shift-jis",
            Some(&fp),
        )
        .unwrap_err();
        assert!(err2.contains("Unsupported or unknown encoding"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_save_null_fingerprint_rejected() {
        let temp_dir = create_temp_dir("save_null_fp");
        let lrc_path = temp_dir.join("song.lrc");
        fs::write(&lrc_path, b"Initial").unwrap();

        let err = save_lrc_file(
            &lrc_path.to_string_lossy(),
            "content",
            "utf-8",
            None,
        )
        .unwrap_err();
        assert!(err.contains("Source fingerprint unavailable"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_save_externally_modified_source_rejected() {
        let temp_dir = create_temp_dir("save_modified");
        let lrc_path = temp_dir.join("song.lrc");
        fs::write(&lrc_path, b"Version 1").unwrap();

        let fp1 = compute_file_fingerprint(&lrc_path).unwrap();

        // Simulate external modification
        fs::write(&lrc_path, b"Version 2 modified externally").unwrap();

        let err = save_lrc_file(
            &lrc_path.to_string_lossy(),
            "Version 3 from editor",
            "utf-8",
            Some(&fp1),
        )
        .unwrap_err();

        assert!(err.contains("Source file modified externally"));
        // Original modified file must not be overwritten
        assert_eq!(fs::read(&lrc_path).unwrap(), b"Version 2 modified externally");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_save_original_file_remains_unchanged_after_rejection() {
        let temp_dir = create_temp_dir("save_unchanged_on_err");
        let lrc_path = temp_dir.join("song.lrc");
        let original_bytes = b"[00:00.00]Original pristine content\n";
        fs::write(&lrc_path, original_bytes).unwrap();

        let fp = compute_file_fingerprint(&lrc_path).unwrap();

        // Trigger failure with invalid encoding
        let _ = save_lrc_file(
            &lrc_path.to_string_lossy(),
            "new content",
            "invalid-encoding",
            Some(&fp),
        );

        assert_eq!(fs::read(&lrc_path).unwrap(), original_bytes);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_save_temporary_file_cleanup() {
        let temp_dir = create_temp_dir("save_cleanup");
        let lrc_path = temp_dir.join("song.lrc");
        fs::write(&lrc_path, b"Initial").unwrap();

        let fp = compute_file_fingerprint(&lrc_path).unwrap();

        // Successful save
        save_lrc_file(
            &lrc_path.to_string_lossy(),
            "Updated",
            "utf-8",
            Some(&fp),
        )
        .unwrap();

        // Verify no leftover .tmp files
        let entries = fs::read_dir(&temp_dir).unwrap();
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().unwrap().to_string_lossy();
            assert!(!name.ends_with(".tmp"), "Found leftover tmp file: {}", name);
        }

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_save_size_mtime_fingerprint_verification() {
        let temp_dir = create_temp_dir("save_size_mtime");
        let lrc_path = temp_dir.join("song.lrc");
        fs::write(&lrc_path, b"Initial data").unwrap();

        let meta = fs::metadata(&lrc_path).unwrap();
        let size = meta.len();
        let mtime = meta
            .modified()
            .unwrap()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let sm_fp = LyricsSourceFingerprint {
            algorithm: "size-mtime".to_string(),
            value: format!("{}:{}", size, mtime),
            size_bytes: Some(size),
            modified_time_milliseconds: Some(mtime),
        };

        // Saving with matching size-mtime should succeed
        let res = save_lrc_file(
            &lrc_path.to_string_lossy(),
            "[00:01.00]Saved via size-mtime",
            "utf-8",
            Some(&sm_fp),
        );
        assert!(res.is_ok());

        // Now with outdated size-mtime, saving should fail
        let err = save_lrc_file(
            &lrc_path.to_string_lossy(),
            "[00:02.00]Should fail",
            "utf-8",
            Some(&sm_fp),
        )
        .unwrap_err();
        assert!(err.contains("Source file modified externally"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_fallback_safe_backup_and_swap_directly() {
        let temp_dir = create_temp_dir("backup_swap");
        let target_path = temp_dir.join("original.lrc");
        let temp_path = temp_dir.join(".temp_swap.tmp");

        fs::write(&target_path, b"Original file content").unwrap();
        fs::write(&temp_path, b"New file content").unwrap();

        safe_backup_and_swap(&temp_path, &target_path).expect("Backup swap should succeed");

        assert_eq!(fs::read(&target_path).unwrap(), b"New file content");
        assert!(!temp_path.exists());

        // Ensure no backup files left
        for entry in fs::read_dir(&temp_dir).unwrap().flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            assert!(!name.ends_with(".bak"), "Leftover backup file: {}", name);
        }

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
