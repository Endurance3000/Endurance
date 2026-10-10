#[cfg(test)]
mod tests {
    use crate::artwork::ArtworkCache;
    use crate::db::Database;
    use crate::lyrics::find_and_read_lrc;
    use crate::models::Track;
    use crate::scanner::{generate_track_id, is_supported_audio, LibraryScanner};
    use std::path::Path;

    #[test]
    fn test_supported_audio_formats() {
        // Supported formats (lower and uppercase)
        assert!(is_supported_audio(Path::new("song.mp3")));
        assert!(is_supported_audio(Path::new("song.MP3")));
        assert!(is_supported_audio(Path::new("song.m4a")));
        assert!(is_supported_audio(Path::new("song.M4A")));
        assert!(is_supported_audio(Path::new("song.flac")));
        assert!(is_supported_audio(Path::new("song.FLAC")));
        assert!(is_supported_audio(Path::new("song.wav")));
        assert!(is_supported_audio(Path::new("song.WAV")));
        assert!(is_supported_audio(Path::new("song.aac")));
        assert!(is_supported_audio(Path::new("song.AAC")));
        assert!(is_supported_audio(Path::new("song.ogg")));
        assert!(is_supported_audio(Path::new("song.OGG")));
        assert!(is_supported_audio(Path::new("song.opus")));
        assert!(is_supported_audio(Path::new("song.OPUS")));
        assert!(is_supported_audio(Path::new("song.aiff")));
        assert!(is_supported_audio(Path::new("song.AIFF")));
        assert!(is_supported_audio(Path::new("song.aif")));
        assert!(is_supported_audio(Path::new("song.AIF")));

        // Unsupported / out-of-scope extensions
        assert!(!is_supported_audio(Path::new("song.wma")));
        assert!(!is_supported_audio(Path::new("song.ape")));
        assert!(!is_supported_audio(Path::new("song.lrc")));
        assert!(!is_supported_audio(Path::new("song.txt")));
        assert!(!is_supported_audio(Path::new("song")));
    }

    #[test]
    fn test_track_id_deterministic() {
        let path1 = "c:/music/test.mp3";
        let path2 = "c:/music/test.mp3";
        let path3 = "c:/music/other.mp3";

        let id1 = generate_track_id(path1);
        let id2 = generate_track_id(path2);
        let id3 = generate_track_id(path3);

        assert_eq!(id1, id2);
        assert_ne!(id1, id3);
        assert_eq!(id1.len(), 64); // SHA-256 hex string
    }

    #[test]
    fn test_database_operations() {
        let temp_dir = std::env::temp_dir().join(format!("endurance_test_{}", std::process::id()));
        let db_path = temp_dir.join("test.db");
        let db = Database::new(&db_path).expect("Failed to create test db");

        // 1. Folders
        db.add_folder("C:/Music").expect("Add folder");
        let folders = db.get_folders().expect("Get folders");
        assert_eq!(folders.len(), 1);
        assert_eq!(folders[0].path, "C:/Music");

        // 2. Track Upsert
        let track = Track {
            id: generate_track_id("C:/Music/test.mp3"),
            file_path: "C:/Music/test.mp3".to_string(),
            file_name: "test.mp3".to_string(),
            file_size: 1024,
            modified_time: 1234567,
            title: "Test Track".to_string(),
            artist: "Test Artist".to_string(),
            album: "Test Album".to_string(),
            album_artist: None,
            genre: Some("Electronic".to_string()),
            year: Some(2026),
            track_number: Some(1),
            disc_number: Some(1),
            duration: 180.5,
            artwork_hash: None,
            is_favorite: false,
            is_available: true,
            date_added: "1234567".to_string(),
            last_scanned: "1234567".to_string(),
        };

        db.upsert_track(&track).expect("Upsert track");
        let tracks = db.get_tracks().expect("Get tracks");
        assert_eq!(tracks.len(), 1);
        assert_eq!(tracks[0].title, "Test Track");
        assert!(!tracks[0].is_favorite);

        // 3. Toggle favorite
        let new_fav = db.toggle_favorite(&track.id).expect("Toggle favorite");
        assert!(new_fav);
        let tracks_updated = db.get_tracks().expect("Get tracks");
        assert!(tracks_updated[0].is_favorite);

        // 4. Missing file handling
        let marked = db.mark_missing_tracks(&[track.file_path.clone()]).expect("Mark missing");
        assert_eq!(marked, 1);
        let tracks_after_missing = db.get_tracks().expect("Get tracks");
        assert_eq!(tracks_after_missing.len(), 0); // is_available = 0 tracks omitted from available list

        // Cleanup
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_external_endurance_test_scan_if_exists() {
        let external_path = r"C:\Users\LENOVO\Documents\Endurance-Test";
        if Path::new(external_path).exists() {
            let temp_dir = std::env::temp_dir().join(format!("endurance_scan_test_{}", std::process::id()));
            let db_path = temp_dir.join("test_scan.db");
            let cache_dir = temp_dir.join("artwork");

            let db = Database::new(&db_path).expect("Create db");
            let artwork_cache = ArtworkCache::new(&cache_dir).expect("Create cache");
            let scanner = LibraryScanner::new();

            // Initial Scan
            let summary1 = scanner
                .scan_folders(&db, &artwork_cache, &[external_path.to_string()], None)
                .expect("Scan external folder");

            if !summary1.errors.is_empty() {
                eprintln!("Scan errors in Endurance-Test ({}): {:?}", summary1.errors.len(), summary1.errors);
            }
            assert_eq!(summary1.errors.len(), 0, "Expected 0 scan errors, got: {:?}", summary1.errors);
            assert_eq!(summary1.new_tracks, summary1.discovered_files);
            assert_eq!(summary1.unchanged_tracks, 0);

            let tracks = db.get_tracks().expect("Get tracks");
            assert_eq!(tracks.len(), summary1.discovered_files as usize);

            // Rescan: verify zero duplicates and that all tracks are recognized as unchanged!
            let summary2 = scanner
                .scan_folders(&db, &artwork_cache, &[external_path.to_string()], None)
                .expect("Rescan external folder");

            assert_eq!(summary2.discovered_files, summary1.discovered_files);
            assert_eq!(summary2.new_tracks, 0, "No duplicate new tracks on rescan");
            assert_eq!(summary2.unchanged_tracks, summary1.discovered_files, "All tracks should be unchanged");

            let tracks_after = db.get_tracks().expect("Get tracks");
            assert_eq!(tracks_after.len(), tracks.len(), "Track count unchanged");

            // Cleanup
            let _ = std::fs::remove_dir_all(&temp_dir);
        }
    }

    #[test]
    fn test_playback_history_and_preferences() {
        let temp_dir = std::env::temp_dir().join(format!("endurance_p5_test_{}", std::process::id()));
        let db_path = temp_dir.join("p5_test.db");
        let db = Database::new(&db_path).expect("Create test db with migrations");

        // 1. Upsert a test track
        let track = Track {
            id: generate_track_id("C:/Music/track_history.mp3"),
            file_path: "C:/Music/track_history.mp3".to_string(),
            file_name: "track_history.mp3".to_string(),
            file_size: 2048,
            modified_time: 12345678,
            title: "History Track".to_string(),
            artist: "History Artist".to_string(),
            album: "History Album".to_string(),
            album_artist: None,
            genre: None,
            year: Some(2026),
            track_number: Some(1),
            disc_number: Some(1),
            duration: 210.0,
            artwork_hash: None,
            is_favorite: false,
            is_available: true,
            date_added: "12345678".to_string(),
            last_scanned: "12345678".to_string(),
        };
        db.upsert_track(&track).expect("Upsert track");

        // 2. Record history
        db.record_playback_history(&track.id, 45.0, false).expect("Record history 1");
        db.record_playback_history(&track.id, 210.0, true).expect("Record history 2");

        let history = db.get_playback_history(10).expect("Get history");
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].track.title, "History Track");
        assert!(history[0].completed);
        assert_eq!(history[0].duration_played, 210.0);
        assert!(!history[1].completed);
        assert_eq!(history[1].duration_played, 45.0);

        // 3. User Preferences
        db.set_user_preference("theme", "dark").expect("Set theme");
        db.set_user_preference("volume", "0.85").expect("Set volume");

        let prefs = db.get_user_preferences().expect("Get preferences");
        assert_eq!(prefs.get("theme").map(String::as_str), Some("dark"));
        assert_eq!(prefs.get("volume").map(String::as_str), Some("0.85"));

        // Update preference
        db.set_user_preference("theme", "light").expect("Update theme");
        let updated_prefs = db.get_user_preferences().expect("Get updated preferences");
        assert_eq!(updated_prefs.get("theme").map(String::as_str), Some("light"));

        // Cleanup
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_lrc_lyrics_discovery() {
        let temp_dir = std::env::temp_dir().join(format!("endurance_lrc_test_{}", std::process::id()));
        std::fs::create_dir_all(&temp_dir).expect("Create temp dir");

        let audio_path = temp_dir.join("acoustic_melody.mp3");
        let lrc_path = temp_dir.join("acoustic_melody.lrc");

        // Write dummy audio and LRC
        std::fs::write(&audio_path, b"dummy audio").expect("Write audio");
        let lrc_content = "[00:12.50]Strumming the chords\n[00:16.80]A gentle whisper in the wind\n";
        std::fs::write(&lrc_path, lrc_content.as_bytes()).expect("Write lrc");

        let found = find_and_read_lrc(&audio_path.to_string_lossy()).expect("Resolution should succeed");
        assert!(found.is_some());
        let resolved = found.unwrap();
        assert_eq!(resolved.file_path, lrc_path.to_string_lossy());
        assert_eq!(resolved.content, lrc_content);

        // Case insensitivity test
        let upper_audio = temp_dir.join("UPPERCASE_SONG.M4A");
        let lower_lrc = temp_dir.join("uppercase_song.LRC");
        std::fs::write(&upper_audio, b"dummy").expect("Write audio");
        std::fs::write(&lower_lrc, b"[00:05.00]Uppercase test\n").expect("Write lrc");

        let found_case = find_and_read_lrc(&upper_audio.to_string_lossy()).expect("Resolution should succeed");
        assert!(found_case.is_some());
        let resolved_case = found_case.unwrap();
        assert_eq!(resolved_case.file_path, lower_lrc.to_string_lossy());
        assert_eq!(resolved_case.content, "[00:05.00]Uppercase test\n");

        // UTF-8 with BOM test
        let bom_audio = temp_dir.join("bom_song.mp3");
        let bom_lrc = temp_dir.join("bom_song.lrc");
        std::fs::write(&bom_audio, b"dummy").expect("Write audio");
        let mut bom_bytes = vec![0xEF, 0xBB, 0xBF];
        bom_bytes.extend_from_slice(b"[00:01.00]BOM lyrics line\n");
        std::fs::write(&bom_lrc, &bom_bytes).expect("Write BOM lrc");

        let found_bom = find_and_read_lrc(&bom_audio.to_string_lossy()).expect("Resolution should succeed");
        assert!(found_bom.is_some());
        let resolved_bom = found_bom.unwrap();
        assert_eq!(resolved_bom.file_path, bom_lrc.to_string_lossy());
        assert_eq!(resolved_bom.content, "[00:01.00]BOM lyrics line\n");

        // Cleanup
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_show_in_folder_nonexistent_file() {
        let res = crate::commands::show_in_folder("non_existent_file_endurance_test_xyz.mp3".to_string());
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("File does not exist"));
    }

    #[test]
    fn test_get_system_info_reports_dynamic_platform() {
        let info = crate::get_system_info();
        assert_eq!(info["app_name"], "Endurance");
        assert_eq!(info["version"], "0.1.0");
        assert_eq!(info["platform"], std::env::consts::OS);
        assert_eq!(info["status"], "ready");
        assert_eq!(info["offline"], true);

        #[cfg(target_os = "windows")]
        assert_eq!(info["platform"], "windows");

        #[cfg(target_os = "macos")]
        assert_eq!(info["platform"], "macos");

        #[cfg(target_os = "linux")]
        assert_eq!(info["platform"], "linux");
    }

    fn create_test_wav_bytes(duration_secs: f64, sample_rate: u32, channels: u16) -> Vec<u8> {
        let bits_per_sample: u16 = 16;
        let byte_rate = sample_rate * (channels as u32) * (bits_per_sample as u32 / 8);
        let block_align = channels * (bits_per_sample / 8);
        let num_samples = (duration_secs * sample_rate as f64) as u32;
        let data_len = num_samples * (block_align as u32);
        let riff_len = 36 + data_len;

        let mut buf = Vec::new();
        // RIFF header
        buf.extend_from_slice(b"RIFF");
        buf.extend_from_slice(&riff_len.to_le_bytes());
        buf.extend_from_slice(b"WAVE");

        // fmt chunk
        buf.extend_from_slice(b"fmt ");
        buf.extend_from_slice(&16u32.to_le_bytes());
        buf.extend_from_slice(&1u16.to_le_bytes()); // PCM
        buf.extend_from_slice(&channels.to_le_bytes());
        buf.extend_from_slice(&sample_rate.to_le_bytes());
        buf.extend_from_slice(&byte_rate.to_le_bytes());
        buf.extend_from_slice(&block_align.to_le_bytes());
        buf.extend_from_slice(&bits_per_sample.to_le_bytes());

        // data chunk
        buf.extend_from_slice(b"data");
        buf.extend_from_slice(&data_len.to_le_bytes());
        buf.resize(buf.len() + data_len as usize, 0);

        buf
    }

    fn create_test_flac_bytes(
        duration_secs: f64,
        sample_rate: u32,
        channels: u8,
        bits_per_sample: u8,
        comments: &[(&str, &str)],
        picture: Option<(&str, &[u8])>,
    ) -> Vec<u8> {
        let mut buf = Vec::new();
        buf.extend_from_slice(b"fLaC");

        let has_comments = !comments.is_empty();
        let has_picture = picture.is_some();

        // 1. STREAMINFO Block (type 0)
        let is_last_streaminfo = !has_comments && !has_picture;
        let header_byte = if is_last_streaminfo { 0x80 } else { 0x00 };
        buf.push(header_byte);
        buf.extend_from_slice(&[0x00, 0x00, 0x22]); // 34 bytes

        buf.extend_from_slice(&[0x10, 0x00]); // min block size
        buf.extend_from_slice(&[0x10, 0x00]); // max block size
        buf.extend_from_slice(&[0x00, 0x00, 0x00]); // min frame
        buf.extend_from_slice(&[0x00, 0x00, 0x00]); // max frame

        let total_samples = (duration_secs * sample_rate as f64) as u64;
        let ch_field = (channels - 1) as u64;
        let bps_field = (bits_per_sample - 1) as u64;
        let sr_field = sample_rate as u64;

        let b0 = ((sr_field >> 12) & 0xFF) as u8;
        let b1 = ((sr_field >> 4) & 0xFF) as u8;
        let b2 = (((sr_field & 0x0F) << 4) | ((ch_field & 0x07) << 1) | ((bps_field >> 4) & 0x01)) as u8;
        let b3 = (((bps_field & 0x0F) << 4) | ((total_samples >> 32) & 0x0F)) as u8;
        let b4 = ((total_samples >> 24) & 0xFF) as u8;
        let b5 = ((total_samples >> 16) & 0xFF) as u8;
        let b6 = ((total_samples >> 8) & 0xFF) as u8;
        let b7 = (total_samples & 0xFF) as u8;

        buf.extend_from_slice(&[b0, b1, b2, b3, b4, b5, b6, b7]);
        buf.extend_from_slice(&[0u8; 16]); // MD5

        // 2. VORBIS_COMMENT Block (type 4)
        if has_comments {
            let is_last_comments = !has_picture;
            let mut comment_body = Vec::new();

            // Vendor string (little-endian length + utf8)
            let vendor = b"reference libFLAC 1.4.3";
            comment_body.extend_from_slice(&(vendor.len() as u32).to_le_bytes());
            comment_body.extend_from_slice(vendor);

            // Number of comments (little-endian)
            comment_body.extend_from_slice(&(comments.len() as u32).to_le_bytes());
            for (k, v) in comments {
                let entry = format!("{}={}", k, v);
                let bytes = entry.as_bytes();
                comment_body.extend_from_slice(&(bytes.len() as u32).to_le_bytes());
                comment_body.extend_from_slice(bytes);
            }

            let header_byte = if is_last_comments { 0x84 } else { 0x04 };
            buf.push(header_byte);
            let len = comment_body.len() as u32;
            buf.push(((len >> 16) & 0xFF) as u8);
            buf.push(((len >> 8) & 0xFF) as u8);
            buf.push((len & 0xFF) as u8);
            buf.extend_from_slice(&comment_body);
        }

        // 3. PICTURE Block (type 6)
        if let Some((mime, img_data)) = picture {
            let mut pic_body = Vec::new();
            pic_body.extend_from_slice(&3u32.to_be_bytes()); // Type 3: CoverFront (big-endian)
            pic_body.extend_from_slice(&(mime.len() as u32).to_be_bytes()); // MIME length
            pic_body.extend_from_slice(mime.as_bytes()); // MIME
            pic_body.extend_from_slice(&0u32.to_be_bytes()); // Description length
            pic_body.extend_from_slice(&1u32.to_be_bytes()); // Width
            pic_body.extend_from_slice(&1u32.to_be_bytes()); // Height
            pic_body.extend_from_slice(&32u32.to_be_bytes()); // Bits per pixel
            pic_body.extend_from_slice(&0u32.to_be_bytes()); // Color count
            pic_body.extend_from_slice(&(img_data.len() as u32).to_be_bytes()); // Data length
            pic_body.extend_from_slice(img_data); // Image data

            buf.push(0x86); // is_last = 1, type = 6 (PICTURE)
            let len = pic_body.len() as u32;
            buf.push(((len >> 16) & 0xFF) as u8);
            buf.push(((len >> 8) & 0xFF) as u8);
            buf.push((len & 0xFF) as u8);
            buf.extend_from_slice(&pic_body);
        }

        // Minimal audio frame placeholder
        buf.extend_from_slice(&[0xFF, 0xF8, 0x69, 0x02, 0x00, 0x00, 0x00, 0x00]);

        buf
    }

    #[test]
    fn test_wav_metadata_and_duration_extraction() {
        use crate::metadata::{LoftyMetadataReader, MetadataReader};
        use lofty::tag::{Accessor, Tag, TagExt, TagType};

        let temp_dir = std::env::temp_dir().join(format!("endurance_wav_test_{}", std::process::id()));
        std::fs::create_dir_all(&temp_dir).expect("Create temp dir");

        let wav_path = temp_dir.join("studio_session.wav");
        let wav_data = create_test_wav_bytes(2.5, 44100, 2);
        std::fs::write(&wav_path, &wav_data).expect("Write wav");

        // Write ID3/RIFF tag to WAV
        let mut tag = Tag::new(TagType::RiffInfo);
        tag.set_title("Studio Master Session".to_string());
        tag.set_artist("Acoustic Trio".to_string());
        tag.set_album("Live Sessions 2026".to_string());
        tag.save_to_path(&wav_path, lofty::config::WriteOptions::default()).expect("Save tag to wav");

        let reader = LoftyMetadataReader::new();
        let meta = reader.read_metadata(&wav_path).expect("Read wav metadata");

        assert_eq!(meta.title, "Studio Master Session");
        assert_eq!(meta.artist, "Acoustic Trio");
        assert_eq!(meta.album, "Live Sessions 2026");
        assert!((meta.duration - 2.5).abs() < 0.05, "Duration should be ~2.5s, got {}", meta.duration);

        // Fallback test on pure WAV without tags
        let raw_wav_path = temp_dir.join("raw_recording.wav");
        std::fs::write(&raw_wav_path, &wav_data).expect("Write raw wav");
        let raw_meta = reader.read_metadata(&raw_wav_path).expect("Read raw wav metadata");
        assert_eq!(raw_meta.title, "raw_recording");
        assert_eq!(raw_meta.artist, "Unknown Artist");
        assert_eq!(raw_meta.album, "Unknown Album");
        assert!((raw_meta.duration - 2.5).abs() < 0.05);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_flac_metadata_duration_and_artwork_extraction() {
        use crate::metadata::{LoftyMetadataReader, MetadataReader};

        let temp_dir = std::env::temp_dir().join(format!("endurance_flac_test_{}", std::process::id()));
        std::fs::create_dir_all(&temp_dir).expect("Create temp dir");

        // Minimal synthetic PNG (1x1 transparent PNG)
        let sample_png_bytes: [u8; 67] = [
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
            0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
        ];

        let comments = [
            ("TITLE", "Midnight Serenade"),
            ("ARTIST", "Endurance Ensemble"),
            ("ALBUM", "Nocturnes in 96kHz"),
            ("GENRE", "Classical"),
            ("DATE", "2026"),
            ("TRACKNUMBER", "1"),
        ];

        let flac_path = temp_dir.join("high_res_melody.flac");
        let flac_data = create_test_flac_bytes(
            3.0,
            96000,
            2,
            24,
            &comments,
            Some(("image/png", &sample_png_bytes)),
        );
        std::fs::write(&flac_path, &flac_data).expect("Write flac");

        let reader = LoftyMetadataReader::new();
        let meta = reader.read_metadata(&flac_path).expect("Read flac metadata");

        assert_eq!(meta.title, "Midnight Serenade");
        assert_eq!(meta.artist, "Endurance Ensemble");
        assert_eq!(meta.album, "Nocturnes in 96kHz");
        assert_eq!(meta.genre, Some("Classical".to_string()));
        assert_eq!(meta.year, Some(2026));
        assert_eq!(meta.track_number, Some(1));
        assert!((meta.duration - 3.0).abs() < 0.05, "Duration should be ~3.0s, got {}", meta.duration);

        // Verify artwork extraction
        assert!(meta.artwork.is_some(), "Artwork should be extracted from FLAC picture block");
        let art = meta.artwork.unwrap();
        assert_eq!(art.mime_type, "image/png");
        assert_eq!(art.data, sample_png_bytes.to_vec());

        // Test artwork cache storage
        let cache_dir = temp_dir.join("artwork_cache");
        let artwork_cache = ArtworkCache::new(&cache_dir).expect("Create artwork cache");
        let hash = artwork_cache.store_artwork(&art.data, &art.mime_type).expect("Store artwork");
        assert_eq!(hash.len(), 64);
        let uri = artwork_cache.get_data_uri(&hash).expect("Get data URI");
        assert!(uri.starts_with("data:image/png;base64,"));

        // Fallback test on pure FLAC without tags
        let raw_flac_path = temp_dir.join("raw_flac.flac");
        let raw_data = create_test_flac_bytes(3.0, 96000, 2, 24, &[], None);
        std::fs::write(&raw_flac_path, &raw_data).expect("Write raw flac");
        let raw_meta = reader.read_metadata(&raw_flac_path).expect("Read raw flac metadata");
        assert_eq!(raw_meta.title, "raw_flac");
        assert_eq!(raw_meta.artist, "Unknown Artist");
        assert_eq!(raw_meta.album, "Unknown Album");
        assert!((raw_meta.duration - 3.0).abs() < 0.05);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_scanner_end_to_end_flac_wav_discovery_and_indexing() {
        use lofty::tag::{Accessor, Tag, TagExt, TagType};

        let temp_dir = std::env::temp_dir().join(format!("endurance_e2e_formats_{}", std::process::id()));
        let music_dir = temp_dir.join("Music");
        let db_path = temp_dir.join("library.db");
        let cache_dir = temp_dir.join("artwork");

        std::fs::create_dir_all(&music_dir).expect("Create music dir");

        let db = Database::new(&db_path).expect("Create db");
        let artwork_cache = ArtworkCache::new(&cache_dir).expect("Create artwork cache");
        let scanner = LibraryScanner::new();

        // 1. Create a FLAC track
        let flac_path = music_dir.join("track1.flac");
        let flac_comments = [
            ("TITLE", "FLAC Track"),
            ("ARTIST", "FLAC Artist"),
            ("ALBUM", "FLAC Album"),
        ];
        let flac_data = create_test_flac_bytes(4.0, 44100, 2, 16, &flac_comments, None);
        std::fs::write(&flac_path, &flac_data).expect("Write flac");

        // 2. Create an uppercase WAV track (.WAV)
        let wav_path = music_dir.join("track2.WAV");
        std::fs::write(&wav_path, create_test_wav_bytes(5.0, 44100, 2)).expect("Write wav");
        let mut wav_tag = Tag::new(TagType::RiffInfo);
        wav_tag.set_title("WAV Track".to_string());
        wav_tag.set_artist("WAV Artist".to_string());
        wav_tag.set_album("WAV Album".to_string());
        wav_tag.save_to_path(&wav_path, lofty::config::WriteOptions::default()).expect("Save wav tag");

        // 3. Scan folder
        let summary = scanner
            .scan_folders(&db, &artwork_cache, &[music_dir.to_string_lossy().to_string()], None)
            .expect("Scan music folder");

        assert_eq!(summary.discovered_files, 2);
        assert_eq!(summary.new_tracks, 2);
        assert_eq!(summary.errors.len(), 0);

        let tracks = db.get_tracks().expect("Get tracks from DB");
        assert_eq!(tracks.len(), 2);

        let flac_track = tracks.iter().find(|t| t.file_path.ends_with("track1.flac")).expect("Find FLAC track");
        assert_eq!(flac_track.title, "FLAC Track");
        assert_eq!(flac_track.artist, "FLAC Artist");
        assert!((flac_track.duration - 4.0).abs() < 0.05);
        assert!(flac_track.is_available);

        let wav_track = tracks.iter().find(|t| t.file_path.ends_with("track2.WAV")).expect("Find WAV track");
        assert_eq!(wav_track.title, "WAV Track");
        assert_eq!(wav_track.artist, "WAV Artist");
        assert!((wav_track.duration - 5.0).abs() < 0.05);
        assert!(wav_track.is_available);

        // 4. Rescan: ensure 0 duplicates and unchanged count matches
        let rescan = scanner
            .scan_folders(&db, &artwork_cache, &[music_dir.to_string_lossy().to_string()], None)
            .expect("Rescan music folder");
        assert_eq!(rescan.discovered_files, 2);
        assert_eq!(rescan.new_tracks, 0);
        assert_eq!(rescan.unchanged_tracks, 2);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_parse_audio_file_arguments_filtering() {
        use crate::single_instance::parse_audio_file_arguments;

        // 1. Standard executable launch with no file args
        let args1 = vec!["C:\\Program Files\\Endurance\\Endurance.exe"];
        assert_eq!(parse_audio_file_arguments(args1), Vec::<String>::new());

        // 2. Launch with CLI flags and executable
        let args2 = vec![
            "Endurance.exe",
            "--devtools",
            "-v",
            "/silent",
        ];
        assert_eq!(parse_audio_file_arguments(args2), Vec::<String>::new());

        // 3. Launch with audio files containing spaces, quotes, and Unicode
        let args3 = vec![
            "endurance.exe",
            "\"C:\\Music\\My Song with spaces.mp3\"",
            "C:\\Music\\日本語_曲.flac",
            "C:\\Music\\accent_é_track.wav",
            "--flag-ignored",
            "C:\\Music\\lyrics.lrc", // unsupported extension -> ignored
            "C:\\Music\\document.txt", // unsupported extension -> ignored
        ];
        let result3 = parse_audio_file_arguments(args3);
        assert_eq!(result3.len(), 3);
        assert!(result3[0].ends_with("My Song with spaces.mp3"));
        assert!(result3[1].ends_with("日本語_曲.flac"));
        assert!(result3[2].ends_with("accent_é_track.wav"));

        // 4. Case insensitivity for supported extensions
        let args4 = vec![
            "app.exe",
            "track1.OGG",
            "track2.Opus",
            "track3.AAC",
            "track4.AIFF",
            "track5.aif",
        ];
        let result4 = parse_audio_file_arguments(args4);
        assert_eq!(result4.len(), 5);
    }

    #[test]
    fn test_parse_opened_file_urls() {
        use crate::single_instance::{parse_opened_file_urls, parse_opened_file_url_strings};

        let temp_dir = std::env::temp_dir().join(format!("endurance_opened_urls_test_{}", std::process::id()));
        let _ = std::fs::create_dir_all(&temp_dir);

        let space_file = temp_dir.join("Song With Spaces.mp3");
        let unicode_file = temp_dir.join("日本語_曲.flac");
        let accent_file = temp_dir.join("accent_é_track.wav");
        let non_audio = temp_dir.join("notes.txt");
        let lrc_file = temp_dir.join("lyrics.lrc");
        let ogg_file = temp_dir.join("track.OGG");
        let opus_file = temp_dir.join("track.opus");
        let aac_file = temp_dir.join("track.AAC");
        let aiff_file = temp_dir.join("track.AIFF");

        let url_space = url::Url::from_file_path(&space_file).unwrap();
        let url_unicode = url::Url::from_file_path(&unicode_file).unwrap();
        let url_accent = url::Url::from_file_path(&accent_file).unwrap();
        let url_non_audio = url::Url::from_file_path(&non_audio).unwrap();
        let url_lrc = url::Url::from_file_path(&lrc_file).unwrap();
        let url_ogg = url::Url::from_file_path(&ogg_file).unwrap();
        let url_opus = url::Url::from_file_path(&opus_file).unwrap();
        let url_aac = url::Url::from_file_path(&aac_file).unwrap();
        let url_aiff = url::Url::from_file_path(&aiff_file).unwrap();
        let http_url = url::Url::parse("https://example.com/stream.mp3").unwrap();

        // 1. Verify URL percent-encoding works properly
        assert!(url_space.as_str().contains("%20"));

        let urls = vec![
            url_space.clone(),
            url_unicode,
            url_accent,
            url_non_audio,
            url_lrc,
            url_ogg,
            url_opus,
            url_aac,
            url_aiff,
            http_url,
            url_space.clone(), // Duplicate URL
        ];

        let result = parse_opened_file_urls(&urls);

        // Should extract valid audio files, ignore non-audio, ignore HTTP, and deduplicate
        assert_eq!(result.len(), 7); // space, unicode, accent, ogg, opus, aac, aiff
        assert!(result.iter().any(|p| p.ends_with("Song With Spaces.mp3")));
        assert!(result.iter().any(|p| p.ends_with("日本語_曲.flac")));
        assert!(result.iter().any(|p| p.ends_with("accent_é_track.wav")));
        assert!(result.iter().any(|p| p.ends_with("track.OGG")));
        assert!(result.iter().any(|p| p.ends_with("track.opus")));
        assert!(result.iter().any(|p| p.ends_with("track.AAC")));
        assert!(result.iter().any(|p| p.ends_with("track.AIFF")));
        assert!(!result.iter().any(|p| p.ends_with("notes.txt")));
        assert!(!result.iter().any(|p| p.ends_with("lyrics.lrc")));

        // 2. Helper test for string URLs
        let str_urls = vec![
            url_space.as_str().to_string(),
            "invalid://not-a-valid-url".to_string(),
        ];
        let str_result = parse_opened_file_url_strings(&str_urls);
        assert_eq!(str_result.len(), 1);
        assert!(str_result[0].ends_with("Song With Spaces.mp3"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}

