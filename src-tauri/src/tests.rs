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
        assert!(is_supported_audio(Path::new("song.mp3")));
        assert!(is_supported_audio(Path::new("song.MP3")));
        assert!(is_supported_audio(Path::new("song.m4a")));
        assert!(is_supported_audio(Path::new("song.M4A")));
        assert!(!is_supported_audio(Path::new("song.flac")));
        assert!(!is_supported_audio(Path::new("song.wav")));
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

            assert!(summary1.discovered_files > 0, "Should discover audio files in Endurance-Test");
            assert_eq!(summary1.new_tracks, summary1.discovered_files);
            assert_eq!(summary1.unchanged_tracks, 0);
            assert_eq!(summary1.errors.len(), 0);

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

        let found = find_and_read_lrc(&audio_path.to_string_lossy());
        assert_eq!(found, Some(lrc_content.to_string()));

        // Case insensitivity test
        let upper_audio = temp_dir.join("UPPERCASE_SONG.M4A");
        let lower_lrc = temp_dir.join("uppercase_song.LRC");
        std::fs::write(&upper_audio, b"dummy").expect("Write audio");
        std::fs::write(&lower_lrc, b"[00:05.00]Uppercase test\n").expect("Write lrc");

        let found_case = find_and_read_lrc(&upper_audio.to_string_lossy());
        assert_eq!(found_case, Some("[00:05.00]Uppercase test\n".to_string()));

        // Missing LRC test
        let no_lrc_audio = temp_dir.join("lonely_song.mp3");
        std::fs::write(&no_lrc_audio, b"dummy").expect("Write audio");
        assert_eq!(find_and_read_lrc(&no_lrc_audio.to_string_lossy()), None);

        // Cleanup
        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
