use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

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
}
