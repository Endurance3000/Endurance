use base64::prelude::*;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Clone)]
pub struct ArtworkCache {
    cache_dir: PathBuf,
}

impl ArtworkCache {
    pub fn new<P: AsRef<Path>>(cache_dir: P) -> Result<Self, String> {
        let dir = cache_dir.as_ref().to_path_buf();
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        Ok(Self { cache_dir: dir })
    }

    /// Stores raw artwork bytes into local cache and returns the SHA-256 hex hash
    pub fn store_artwork(&self, data: &[u8], mime_type: &str) -> Result<String, String> {
        let mut hasher = Sha256::new();
        hasher.update(data);
        let hash = hex::encode(hasher.finalize());

        let file_path = self.cache_dir.join(format!("{}.bin", hash));
        let meta_path = self.cache_dir.join(format!("{}.mime", hash));

        if !file_path.exists() {
            fs::write(&file_path, data).map_err(|e| e.to_string())?;
            fs::write(&meta_path, mime_type).map_err(|e| e.to_string())?;
        }

        Ok(hash)
    }

    /// Reads artwork on demand as a base64 data URI for individual tracks
    pub fn get_data_uri(&self, hash: &str) -> Option<String> {
        let file_path = self.cache_dir.join(format!("{}.bin", hash));
        let meta_path = self.cache_dir.join(format!("{}.mime", hash));

        if !file_path.exists() {
            return None;
        }

        let data = fs::read(&file_path).ok()?;
        let mime = fs::read_to_string(&meta_path).unwrap_or_else(|_| "image/jpeg".to_string());

        // Format as data URL: data:<mime>;base64,<data>
        let b64 = BASE64_STANDARD.encode(&data);
        Some(format!("data:{};base64,{}", mime.trim(), b64))
    }
}
