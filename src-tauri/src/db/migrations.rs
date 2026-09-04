use rusqlite::{Connection, Result};

pub struct Migration {
    pub version: i32,
    pub name: &'static str,
    pub sql: &'static str,
}

pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "001_initial_library_schema",
        sql: r#"
            -- Configured music library directories
            CREATE TABLE IF NOT EXISTS library_folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE NOT NULL,
                date_added TEXT NOT NULL,
                last_scanned TEXT
            );

            -- Indexed local audio tracks
            CREATE TABLE IF NOT EXISTS tracks (
                id TEXT PRIMARY KEY NOT NULL,
                file_path TEXT UNIQUE NOT NULL,
                file_name TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                modified_time INTEGER NOT NULL,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT NOT NULL,
                album_artist TEXT,
                genre TEXT,
                year INTEGER,
                track_number INTEGER,
                disc_number INTEGER,
                duration REAL NOT NULL DEFAULT 0.0,
                artwork_hash TEXT,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                is_available INTEGER NOT NULL DEFAULT 1,
                date_added TEXT NOT NULL,
                last_scanned TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
            CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
            CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
            CREATE INDEX IF NOT EXISTS idx_tracks_favorite ON tracks(is_favorite);
            CREATE INDEX IF NOT EXISTS idx_tracks_available ON tracks(is_available);
        "#,
    },
];

pub fn run_migrations(conn: &mut Connection) -> Result<()> {
    // Ensure migrations ledger exists
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS _schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        )
        "#,
        [],
    )?;

    for migration in MIGRATIONS {
        let already_applied: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM _schema_migrations WHERE version = ?1)",
            [migration.version],
            |row| row.get(0),
        )?;

        if !already_applied {
            let tx = conn.transaction()?;
            tx.execute_batch(migration.sql)?;
            
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
                .to_string();

            tx.execute(
                "INSERT INTO _schema_migrations (version, name, applied_at) VALUES (?1, ?2, ?3)",
                rusqlite::params![migration.version, migration.name, now],
            )?;

            tx.commit()?;
        }
    }

    Ok(())
}
