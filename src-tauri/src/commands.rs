use crate::artwork::ArtworkCache;
use crate::db::Database;
use crate::lyrics::{find_and_read_lrc, ResolvedLyrics};
use crate::models::{HistoryItem, LibraryFolder, ScanSummary, Track};
use crate::scanner::LibraryScanner;
use std::collections::HashMap;
use tauri::{AppHandle, Manager, State};

pub struct AppState {
    pub db: Database,
    pub artwork_cache: ArtworkCache,
    pub scanner: LibraryScanner,
}

#[tauri::command]
pub async fn pick_music_folder() -> Result<Option<String>, String> {
    let folder = rfd::AsyncFileDialog::new()
        .set_title("Select Music Folder")
        .pick_folder()
        .await;

    Ok(folder.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub fn get_library_folders(state: State<AppState>) -> Result<Vec<LibraryFolder>, String> {
    state.db.get_folders()
}

#[tauri::command]
pub async fn add_library_folder(
    path: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<Vec<LibraryFolder>, String> {
    state.db.add_folder(&path)?;
    
    // Automatically trigger initial scan for the newly added folder
    let db = state.db.clone();
    let cache = state.artwork_cache.clone();
    let scanner = LibraryScanner::new();
    let folder_clone = path.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let _ = scanner.scan_folders(&db, &cache, &[folder_clone], Some(&app_handle));
    })
    .await
    .map_err(|e| format!("Scan error: {}", e))?;

    state.db.get_folders()
}

#[tauri::command]
pub fn remove_library_folder(path: String, state: State<AppState>) -> Result<Vec<LibraryFolder>, String> {
    state.db.remove_folder(&path)?;
    state.db.get_folders()
}

#[tauri::command]
pub async fn scan_library(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<ScanSummary, String> {
    let folders = state.db.get_folders()?;
    let folder_paths: Vec<String> = folders.into_iter().map(|f| f.path).collect();

    let db = state.db.clone();
    let cache = state.artwork_cache.clone();
    let scanner = LibraryScanner::new();

    let summary = tauri::async_runtime::spawn_blocking(move || {
        scanner.scan_folders(&db, &cache, &folder_paths, Some(&app_handle))
    })
    .await
    .map_err(|e| format!("Scan task failed: {}", e))??;

    Ok(summary)
}

#[tauri::command]
pub fn get_tracks(state: State<AppState>) -> Result<Vec<Track>, String> {
    state.db.get_tracks()
}

#[tauri::command]
pub fn toggle_track_favorite(track_id: String, state: State<AppState>) -> Result<bool, String> {
    state.db.toggle_favorite(&track_id)
}

#[tauri::command]
pub fn get_track_artwork(artwork_hash: String, state: State<AppState>) -> Result<Option<String>, String> {
    Ok(state.artwork_cache.get_data_uri(&artwork_hash))
}

#[tauri::command]
pub fn get_track_lyrics(track_file_path: String) -> Result<Option<ResolvedLyrics>, String> {
    find_and_read_lrc(&track_file_path)
}

#[tauri::command]
pub fn save_lyrics_file(
    source_path: String,
    content: String,
    encoding: String,
    expected_fingerprint: Option<crate::lyrics::LyricsSourceFingerprint>,
) -> Result<crate::lyrics::LyricsSourceFingerprint, String> {
    crate::lyrics::save_lrc_file(&source_path, &content, &encoding, expected_fingerprint.as_ref())
}

#[tauri::command]
pub fn record_playback_history(
    track_id: String,
    duration_played: f64,
    completed: bool,
    state: State<AppState>,
) -> Result<(), String> {
    state.db.record_playback_history(&track_id, duration_played, completed)
}

#[tauri::command]
pub fn get_playback_history(limit: Option<usize>, state: State<AppState>) -> Result<Vec<HistoryItem>, String> {
    state.db.get_playback_history(limit.unwrap_or(50))
}

#[tauri::command]
pub fn get_user_preferences(state: State<AppState>) -> Result<HashMap<String, String>, String> {
    state.db.get_user_preferences()
}

#[tauri::command]
pub fn set_user_preference(key: String, value: String, state: State<AppState>) -> Result<(), String> {
    state.db.set_user_preference(&key, &value)
}

#[tauri::command]
pub fn show_in_folder(file_path: String) -> Result<(), String> {
    let path = std::path::Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", file_path))
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to reveal file in Finder: {}", e))?;
        Ok(())
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let parent = path.parent().unwrap_or(path);
        std::process::Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
        Ok(())
    }
}

#[tauri::command]
pub async fn close_splashscreen(app_handle: AppHandle) -> Result<(), String> {
    if let Some(main) = app_handle.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
    if let Some(splash) = app_handle.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    Ok(())
}

