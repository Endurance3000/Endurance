pub mod artwork;
pub mod commands;
pub mod db;
pub mod lyrics;
pub mod metadata;
pub mod mini_player;
pub mod models;
pub mod scanner;
#[cfg(test)]
mod tests;

use artwork::ArtworkCache;
use commands::AppState;
use db::Database;
use scanner::LibraryScanner;
use tauri::{Manager, RunEvent};

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
            mini_player::open_mini_player,
            mini_player::set_mini_player_always_on_top,
            commands::pick_music_folder,
            commands::get_library_folders,
            commands::add_library_folder,
            commands::remove_library_folder,
            commands::scan_library,
            commands::get_tracks,
            commands::toggle_track_favorite,
            commands::get_track_artwork,
            commands::get_track_lyrics,
            commands::save_lyrics_file,
            commands::record_playback_history,
            commands::get_playback_history,
            commands::get_user_preferences,
            commands::set_user_preference,
            commands::show_in_folder
        ])
        .build(tauri::generate_context!())
        .expect("error while building endurance application")
        .run(|app_handle, event| match event {
            RunEvent::WindowEvent { label, event, .. } => {
                if label == "main"
                    && matches!(&event, tauri::WindowEvent::CloseRequested { .. })
                {
                    mini_player::close_mini_player(app_handle);
                }
            }
            _ => {}
        });
}
