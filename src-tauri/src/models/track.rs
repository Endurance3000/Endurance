use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub modified_time: u64,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<u32>,
    pub track_number: Option<u32>,
    pub disc_number: Option<u32>,
    pub duration: f64,
    pub artwork_hash: Option<String>,
    pub is_favorite: bool,
    pub is_available: bool,
    pub date_added: String,
    pub last_scanned: String,
}
