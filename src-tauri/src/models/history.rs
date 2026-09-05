use serde::{Deserialize, Serialize};
use super::Track;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryItem {
    pub id: i64,
    pub track: Track,
    pub played_at: String,
    pub duration_played: f64,
    pub completed: bool,
}
