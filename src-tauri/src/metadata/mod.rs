use lofty::prelude::*;
use lofty::probe::Probe;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct ExtractedArtwork {
    pub data: Vec<u8>,
    pub mime_type: String,
}

#[derive(Debug, Clone)]
pub struct RawMetadata {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<u32>,
    pub track_number: Option<u32>,
    pub disc_number: Option<u32>,
    pub duration: f64,
    pub artwork: Option<ExtractedArtwork>,
}

/// Abstract contract for reading audio metadata, allowing swappable underlying engines
pub trait MetadataReader: Send + Sync {
    fn read_metadata(&self, path: &Path) -> Result<RawMetadata, String>;
}

pub struct LoftyMetadataReader;

impl LoftyMetadataReader {
    pub fn new() -> Self {
        Self
    }
}

impl Default for LoftyMetadataReader {
    fn default() -> Self {
        Self::new()
    }
}

impl MetadataReader for LoftyMetadataReader {
    fn read_metadata(&self, path: &Path) -> Result<RawMetadata, String> {
        let tagged_file = Probe::open(path)
            .map_err(|e| format!("Failed to open audio file: {}", e))?
            .read()
            .map_err(|e| format!("Failed to parse audio tags: {}", e))?;

        let properties = tagged_file.properties();
        let duration = properties.duration().as_secs_f64();

        // Get primary tag or first available tag (ID3v2, ID3v1, MP4 ilst, etc.)
        let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());

        // Derive title fallback from filename if metadata tag is empty
        let filename_stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown Track")
            .to_string();

        let title = tag
            .and_then(|t| t.title().as_deref().map(|s| s.trim().to_string()))
            .filter(|s| !s.is_empty())
            .unwrap_or(filename_stem);

        let artist = tag
            .and_then(|t| t.artist().as_deref().map(|s| s.trim().to_string()))
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "Unknown Artist".to_string());

        let album = tag
            .and_then(|t| t.album().as_deref().map(|s| s.trim().to_string()))
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "Unknown Album".to_string());

        let genre = tag
            .and_then(|t| t.genre().as_deref().map(|s| s.trim().to_string()))
            .filter(|s| !s.is_empty());

        let year = tag.and_then(|t| t.year());
        let track_number = tag.and_then(|t| t.track());
        let disc_number = tag.and_then(|t| t.disk());

        // Extract picture (FrontCover preferred, or first available)
        let artwork = tag.and_then(|t| {
            let pictures = t.pictures();
            let pic = pictures
                .iter()
                .find(|p| p.pic_type() == lofty::picture::PictureType::CoverFront)
                .or_else(|| pictures.first());

            pic.map(|p| ExtractedArtwork {
                data: p.data().to_vec(),
                mime_type: p
                    .mime_type()
                    .as_deref()
                    .map(|m| m.as_str().to_string())
                    .unwrap_or_else(|| "image/jpeg".to_string()),
            })
        });

        Ok(RawMetadata {
            title,
            artist,
            album,
            album_artist: None,
            genre,
            year,
            track_number,
            disc_number,
            duration,
            artwork,
        })
    }
}
