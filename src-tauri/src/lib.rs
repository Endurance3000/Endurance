pub mod artwork;
pub mod commands;
pub mod db;
pub mod lyrics;
pub mod metadata;
pub mod models;
pub mod scanner;
#[cfg(test)]
mod tests;

use artwork::ArtworkCache;
use commands::AppState;
use db::Database;
use scanner::LibraryScanner;
use tauri::Manager;

#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "app_name": "Endurance",
        "version": "0.1.0",
        "platform": "windows",
        "status": "ready",
        "offline": true
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            // Determine persistent local AppData path for SQLite and artwork cache
            let app_data_dir = app_handle
                .path()
                .app_data_dir()
                .map_err(|e| format!("Failed to get app_data_dir: {}", e))?;

            std::fs::create_dir_all(&app_data_dir).map_err(|e| format!("Failed to create app_data_dir: {}", e))?;

            let db_path = app_data_dir.join("endurance.db");
            let artwork_dir = app_data_dir.join("artwork_cache");

            let db = Database::new(&db_path).map_err(|e| format!("Failed to init database: {}", e))?;
            let artwork_cache = ArtworkCache::new(&artwork_dir).map_err(|e| format!("Failed to init artwork cache: {}", e))?;
            let scanner = LibraryScanner::new();

            app.manage(AppState {
                db,
                artwork_cache,
                scanner,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            commands::pick_music_folder,
            commands::get_library_folders,
            commands::add_library_folder,
            commands::remove_library_folder,
            commands::scan_library,
            commands::get_tracks,
            commands::toggle_track_favorite,
            commands::get_track_artwork,
            commands::get_track_lyrics,
            commands::record_playback_history,
            commands::get_playback_history,
            commands::get_user_preferences,
            commands::set_user_preference
        ])
        .run(tauri::generate_context!())
        .expect("error while running endurance application");
}
