use crate::artwork::ArtworkCache;
use crate::db::Database;
use crate::models::{LibraryFolder, ScanSummary, Track};
use crate::scanner::LibraryScanner;
use tauri::{AppHandle, State};

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
