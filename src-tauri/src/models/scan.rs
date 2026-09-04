use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanSummary {
    pub discovered_files: u32,
    pub new_tracks: u32,
    pub updated_tracks: u32,
    pub unchanged_tracks: u32,
    pub missing_tracks: u32,
    pub total_tracks_in_library: u32,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgressPayload {
    pub phase: String, // "discovering" | "indexing" | "completed"
    pub current_file: String,
    pub processed_count: u32,
    pub total_discovered: u32,
}
