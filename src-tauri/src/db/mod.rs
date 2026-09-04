pub mod migrations;

use crate::models::{LibraryFolder, Track};
use rusqlite::{params, Connection, Result};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self, String> {
        let path_ref = path.as_ref();
        if let Some(parent) = path_ref.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let mut conn = Connection::open(path_ref).map_err(|e| e.to_string())?;

        // Enable foreign keys and optimize performance for local desktop use
        conn.execute_batch(
            r#"
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            "#,
        )
        .map_err(|e| e.to_string())?;

        migrations::run_migrations(&mut conn).map_err(|e| e.to_string())?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn get_folders(&self) -> Result<Vec<LibraryFolder>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, path, date_added, last_scanned FROM library_folders ORDER BY id ASC")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(LibraryFolder {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    date_added: row.get(2)?,
                    last_scanned: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut folders = Vec::new();
        for r in rows {
            folders.push(r.map_err(|e| e.to_string())?);
        }
        Ok(folders)
    }

    pub fn add_folder(&self, path: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();

        conn.execute(
            "INSERT OR IGNORE INTO library_folders (path, date_added) VALUES (?1, ?2)",
            params![path, now],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn remove_folder(&self, path: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        // Remove folder record
        conn.execute("DELETE FROM library_folders WHERE path = ?1", params![path])
            .map_err(|e| e.to_string())?;
        
        // Also mark tracks under this folder as unavailable
        conn.execute(
            "UPDATE tracks SET is_available = 0 WHERE file_path LIKE ?1",
            params![format!("{}%", path)],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn update_folder_last_scanned(&self, path: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();

        conn.execute(
            "UPDATE library_folders SET last_scanned = ?1 WHERE path = ?2",
            params![now, path],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_tracks(&self) -> Result<Vec<Track>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                r#"
                SELECT 
                    id, file_path, file_name, file_size, modified_time,
                    title, artist, album, album_artist, genre,
                    year, track_number, disc_number, duration, artwork_hash,
                    is_favorite, is_available, date_added, last_scanned
                FROM tracks
                WHERE is_available = 1
                ORDER BY title COLLATE NOCASE ASC
                "#,
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                let is_fav_int: i32 = row.get(15)?;
                let is_avail_int: i32 = row.get(16)?;
                Ok(Track {
                    id: row.get(0)?,
                    file_path: row.get(1)?,
                    file_name: row.get(2)?,
                    file_size: row.get::<_, i64>(3)? as u64,
                    modified_time: row.get::<_, i64>(4)? as u64,
                    title: row.get(5)?,
                    artist: row.get(6)?,
                    album: row.get(7)?,
                    album_artist: row.get(8)?,
                    genre: row.get(9)?,
                    year: row.get(10)?,
                    track_number: row.get(11)?,
                    disc_number: row.get(12)?,
                    duration: row.get(13)?,
                    artwork_hash: row.get(14)?,
                    is_favorite: is_fav_int == 1,
                    is_available: is_avail_int == 1,
                    date_added: row.get(17)?,
                    last_scanned: row.get(18)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut tracks = Vec::new();
        for r in rows {
            tracks.push(r.map_err(|e| e.to_string())?);
        }
        Ok(tracks)
    }

    /// Fast lookup of existing (file_size, modified_time, is_available) for all tracks currently in DB.
    /// Used by the scanner to avoid re-parsing unchanged files.
    pub fn get_track_cache_map(&self) -> Result<HashMap<String, (u64, u64, bool)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT file_path, file_size, modified_time, is_available FROM tracks")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                let path: String = row.get(0)?;
                let size = row.get::<_, i64>(1)? as u64;
                let mtime = row.get::<_, i64>(2)? as u64;
                let avail = row.get::<_, i32>(3)? == 1;
                Ok((path, (size, mtime, avail)))
            })
            .map_err(|e| e.to_string())?;

        let mut map = HashMap::new();
        for r in rows {
            let (p, tuple) = r.map_err(|e| e.to_string())?;
            map.insert(p, tuple);
        }
        Ok(map)
    }

    pub fn upsert_track(&self, track: &Track) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            r#"
            INSERT INTO tracks (
                id, file_path, file_name, file_size, modified_time,
                title, artist, album, album_artist, genre,
                year, track_number, disc_number, duration, artwork_hash,
                is_favorite, is_available, date_added, last_scanned
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5,
                ?6, ?7, ?8, ?9, ?10,
                ?11, ?12, ?13, ?14, ?15,
                ?16, ?17, ?18, ?19
            )
            ON CONFLICT(file_path) DO UPDATE SET
                file_size = excluded.file_size,
                modified_time = excluded.modified_time,
                title = excluded.title,
                artist = excluded.artist,
                album = excluded.album,
                album_artist = excluded.album_artist,
                genre = excluded.genre,
                year = excluded.year,
                track_number = excluded.track_number,
                disc_number = excluded.disc_number,
                duration = excluded.duration,
                artwork_hash = excluded.artwork_hash,
                is_available = 1,
                last_scanned = excluded.last_scanned
            "#,
            params![
                track.id,
                track.file_path,
                track.file_name,
                track.file_size as i64,
                track.modified_time as i64,
                track.title,
                track.artist,
                track.album,
                track.album_artist,
                track.genre,
                track.year,
                track.track_number,
                track.disc_number,
                track.duration,
                track.artwork_hash,
                if track.is_favorite { 1 } else { 0 },
                1, // is_available
                track.date_added,
                track.last_scanned,
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn update_track_last_scanned(&self, file_path: &str, last_scanned: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE tracks SET last_scanned = ?1, is_available = 1 WHERE file_path = ?2",
            params![last_scanned, file_path],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn mark_missing_tracks(&self, file_paths: &[String]) -> Result<u32, String> {
        if file_paths.is_empty() {
            return Ok(0);
        }
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut count = 0;
        for path in file_paths {
            let changed = conn
                .execute("UPDATE tracks SET is_available = 0 WHERE file_path = ?1 AND is_available = 1", params![path])
                .map_err(|e| e.to_string())?;
            count += changed as u32;
        }
        Ok(count)
    }

    pub fn toggle_favorite(&self, track_id: &str) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let current: i32 = conn
            .query_row(
                "SELECT is_favorite FROM tracks WHERE id = ?1",
                params![track_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        let new_state = if current == 1 { 0 } else { 1 };
        conn.execute(
            "UPDATE tracks SET is_favorite = ?1 WHERE id = ?2",
            params![new_state, track_id],
        )
        .map_err(|e| e.to_string())?;

        Ok(new_state == 1)
    }
}
