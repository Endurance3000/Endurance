use crate::artwork::ArtworkCache;
use crate::db::Database;
use crate::metadata::{LoftyMetadataReader, MetadataReader};
use crate::models::{ScanProgressPayload, ScanSummary, Track};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::path::Path;
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

/// Generates a stable track ID from the normalized file path.
/// NOTE & LIMITATION:
/// Track identity is derived from the canonical file path. If a user moves a file
/// to a different path or folder, it will be treated as a new track. If a file is
/// returned to its previous path, its existing database record, favorite state, and
/// metadata will be seamlessly restored.
pub fn generate_track_id(normalized_path: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(normalized_path.as_bytes());
    hex::encode(hasher.finalize())
}

/// Case-insensitive check for supported music formats: .mp3 and .m4a
pub fn is_supported_audio(path: &Path) -> bool {
    if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
        let ext_lower = ext.to_lowercase();
        ext_lower == "mp3" || ext_lower == "m4a"
    } else {
        false
    }
}

pub struct LibraryScanner {
    metadata_reader: Box<dyn MetadataReader>,
}

impl LibraryScanner {
    pub fn new() -> Self {
        Self {
            metadata_reader: Box::new(LoftyMetadataReader::new()),
        }
    }

    pub fn scan_folders(
        &self,
        db: &Database,
        artwork_cache: &ArtworkCache,
        folder_paths: &[String],
        app_handle: Option<&AppHandle>,
    ) -> Result<ScanSummary, String> {
        let mut discovered_files: Vec<(String, u64, u64)> = Vec::new(); // (path, size, mtime)
        let mut discovered_path_set: HashSet<String> = HashSet::new();

        // 1. Discovery Phase: Traverse configured directories recursively
        for folder_path in folder_paths {
            let path_obj = Path::new(folder_path);
            if !path_obj.exists() || !path_obj.is_dir() {
                continue;
            }

            for entry in WalkDir::new(path_obj).follow_links(true).into_iter().filter_map(|e| e.ok()) {
                let p = entry.path();
                if p.is_file() && is_supported_audio(p) {
                    if let Ok(metadata) = p.metadata() {
                        let file_size = metadata.len();
                        let mtime = metadata
                            .modified()
                            .ok()
                            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_secs())
                            .unwrap_or(0);

                        let canonical_path = p
                            .canonicalize()
                            .unwrap_or_else(|_| p.to_path_buf())
                            .to_string_lossy()
                            .replace(r"\\?\", "") // Normalize Windows verbatim path prefix
                            .to_string();

                        discovered_files.push((canonical_path.clone(), file_size, mtime));
                        discovered_path_set.insert(canonical_path);
                    }
                }
            }
        }

        let total_discovered = discovered_files.len() as u32;

        if let Some(handle) = app_handle {
            let _ = handle.emit(
                "library://scan-progress",
                ScanProgressPayload {
                    phase: "indexing".to_string(),
                    current_file: "".to_string(),
                    processed_count: 0,
                    total_discovered,
                },
            );
        }

        // 2. Fetch existing track fingerprints from SQLite for O(1) comparison
        let cache_map = db.get_track_cache_map()?;

        let mut new_tracks = 0;
        let mut updated_tracks = 0;
        let mut unchanged_tracks = 0;
        let mut errors = Vec::new();
        let now_str = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();

        // 3. Ingestion Phase: Process discovered files
        for (idx, (file_path, file_size, mtime)) in discovered_files.into_iter().enumerate() {
            if let Some(handle) = app_handle {
                // Emit progress every 10 files or on completion to prevent event flooding
                if idx % 10 == 0 || idx as u32 == total_discovered - 1 {
                    let _ = handle.emit(
                        "library://scan-progress",
                        ScanProgressPayload {
                            phase: "indexing".to_string(),
                            current_file: file_path.clone(),
                            processed_count: (idx + 1) as u32,
                            total_discovered,
                        },
                    );
                }
            }

            // Rescan performance optimization:
            // Check if file is already in DB with identical size and modification timestamp
            if let Some(&(cached_size, cached_mtime, is_available)) = cache_map.get(&file_path) {
                if cached_size == file_size && cached_mtime == mtime {
                    unchanged_tracks += 1;
                    if !is_available {
                        // File previously marked missing has returned to the same path!
                        let _ = db.update_track_last_scanned(&file_path, &now_str);
                    }
                    continue;
                }
            }

            // File is new or has changed on disk: parse metadata and extract artwork
            let path_obj = Path::new(&file_path);
            let file_name = path_obj
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("Unknown File")
                .to_string();

            match self.metadata_reader.read_metadata(path_obj) {
                Ok(raw_meta) => {
                    let mut artwork_hash = None;
                    if let Some(art) = raw_meta.artwork {
                        if let Ok(hash) = artwork_cache.store_artwork(&art.data, &art.mime_type) {
                            artwork_hash = Some(hash);
                        }
                    }

                    let track_id = generate_track_id(&file_path);
                    let is_new = !cache_map.contains_key(&file_path);

                    let track = Track {
                        id: track_id,
                        file_path: file_path.clone(),
                        file_name,
                        file_size,
                        modified_time: mtime,
                        title: raw_meta.title,
                        artist: raw_meta.artist,
                        album: raw_meta.album,
                        album_artist: raw_meta.album_artist,
                        genre: raw_meta.genre,
                        year: raw_meta.year,
                        track_number: raw_meta.track_number,
                        disc_number: raw_meta.disc_number,
                        duration: raw_meta.duration,
                        artwork_hash,
                        is_favorite: false,
                        is_available: true,
                        date_added: now_str.clone(),
                        last_scanned: now_str.clone(),
                    };

                    if let Err(e) = db.upsert_track(&track) {
                        errors.push(format!("DB error for {}: {}", file_path, e));
                    } else if is_new {
                        new_tracks += 1;
                    } else {
                        updated_tracks += 1;
                    }
                }
                Err(e) => {
                    errors.push(format!("Failed to parse metadata for {}: {}", file_path, e));
                }
            }
        }

        // 4. Missing File Detection:
        // Correction 6: Only evaluate missing status for tracks whose parent path matches
        // one of the folders actively being scanned. Do NOT touch tracks from other folders!
        let mut missing_paths = Vec::new();
        for (cached_path, (_, _, is_available)) in cache_map.iter() {
            if *is_available {
                let matches_scanned_folder = folder_paths.iter().any(|folder| {
                    let norm_folder = folder.replace(r"\\?\", "");
                    cached_path.starts_with(&norm_folder)
                });

                if matches_scanned_folder && !discovered_path_set.contains(cached_path) {
                    missing_paths.push(cached_path.clone());
                }
            }
        }

        let missing_tracks = db.mark_missing_tracks(&missing_paths).unwrap_or(0);

        // 5. Update last_scanned on all scanned library folders
        for folder in folder_paths {
            let _ = db.update_folder_last_scanned(folder);
        }

        let total_tracks = db.get_tracks().map(|t| t.len() as u32).unwrap_or(0);

        if let Some(handle) = app_handle {
            let _ = handle.emit(
                "library://scan-progress",
                ScanProgressPayload {
                    phase: "completed".to_string(),
                    current_file: "".to_string(),
                    processed_count: total_discovered,
                    total_discovered,
                },
            );
        }

        Ok(ScanSummary {
            discovered_files: total_discovered,
            new_tracks,
            updated_tracks,
            unchanged_tracks,
            missing_tracks,
            total_tracks_in_library: total_tracks,
            errors,
        })
    }
}
