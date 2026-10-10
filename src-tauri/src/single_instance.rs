use crate::scanner::is_supported_audio;
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

pub const SINGLE_INSTANCE_PORT: u16 = 47921;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenFilesPayload {
    pub file_paths: Vec<String>,
}

pub enum SingleInstanceResult {
    Primary(SingleInstanceServer),
    Forwarded,
}

pub struct SingleInstanceServer {
    listener: TcpListener,
}

impl SingleInstanceServer {
    pub fn start(self, app_handle: AppHandle, pending_files: Arc<Mutex<Vec<String>>>) {
        std::thread::spawn(move || {
            for stream in self.listener.incoming() {
                if let Ok(mut stream) = stream {
                    let mut buffer = Vec::new();
                    // Read up to 64KB of argument payload
                    let mut chunk = [0u8; 4096];
                    loop {
                        match stream.read(&mut chunk) {
                            Ok(0) => break,
                            Ok(n) => {
                                buffer.extend_from_slice(&chunk[..n]);
                                if buffer.len() > 65536 {
                                    break;
                                }
                            }
                            Err(_) => break,
                        }
                    }

                    if let Ok(file_paths) = serde_json::from_slice::<Vec<String>>(&buffer) {
                        handle_open_file_paths(&app_handle, &pending_files, file_paths);
                    }
                }
            }
        });
    }
}

/// Dispatches open file paths to the running frontend, focuses the main window,
/// and updates the pending files queue as fallback.
pub fn handle_open_file_paths(
    app_handle: &AppHandle,
    pending_files: &Arc<Mutex<Vec<String>>>,
    file_paths: Vec<String>,
) {
    if file_paths.is_empty() {
        return;
    }

    // 1. Focus and restore main window
    if let Some(main) = app_handle.get_webview_window("main") {
        let _ = main.unminimize();
        let _ = main.show();
        let _ = main.set_focus();
    }

    // 2. Store in pending queue as fallback for startup/cold start
    if let Ok(mut pending) = pending_files.lock() {
        for path in &file_paths {
            if !pending.contains(path) {
                pending.push(path.clone());
            }
        }
    }

    // 3. Emit live event to frontend if already running
    let _ = app_handle.emit(
        "endurance://open-files",
        OpenFilesPayload { file_paths },
    );
}

/// Parses file URLs (such as from macOS Finder RunEvent::Opened) into valid local audio file paths.
/// Handles percent-decoding (spaces, Unicode, symbols) safely via Url::to_file_path.
pub fn parse_opened_file_urls(urls: &[url::Url]) -> Vec<String> {
    let mut valid_paths = Vec::new();
    for url in urls {
        if let Ok(path) = url.to_file_path() {
            if is_supported_audio(&path) {
                let normalized = if path.is_absolute() {
                    path.to_string_lossy().replace(r"\\?\", "").to_string()
                } else if let Ok(canonical) = path.canonicalize() {
                    canonical.to_string_lossy().replace(r"\\?\", "").to_string()
                } else {
                    path.to_string_lossy().replace(r"\\?\", "").to_string()
                };
                if !valid_paths.contains(&normalized) {
                    valid_paths.push(normalized);
                }
            }
        }
    }
    valid_paths
}

/// Helper for parsing URL strings (useful for tests and external inputs).
pub fn parse_opened_file_url_strings<S: AsRef<str>>(url_strings: &[S]) -> Vec<String> {
    let urls: Vec<url::Url> = url_strings
        .iter()
        .filter_map(|s| url::Url::parse(s.as_ref()).ok())
        .collect();
    parse_opened_file_urls(&urls)
}

/// Parses CLI arguments and filters out binary paths/flags, extracting valid audio file paths.
pub fn parse_audio_file_arguments<I, S>(args: I) -> Vec<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    let mut valid_paths = Vec::new();
    let args_iter = args.into_iter().enumerate();

    for (idx, arg_ref) in args_iter {
        let arg = arg_ref.as_ref().trim().trim_matches('"');
        if arg.is_empty() {
            continue;
        }

        // Skip executable name (first argument)
        if idx == 0 && (arg.ends_with(".exe") || arg.ends_with("endurance") || !arg.contains('.')) {
            continue;
        }

        // Skip standard CLI flags
        if arg.starts_with('-') || arg.starts_with('/') {
            continue;
        }

        let path = Path::new(arg);
        if is_supported_audio(path) {
            let normalized = if path.is_absolute() {
                path.to_string_lossy().replace(r"\\?\", "").to_string()
            } else if let Ok(canonical) = path.canonicalize() {
                canonical.to_string_lossy().replace(r"\\?\", "").to_string()
            } else {
                arg.to_string()
            };
            valid_paths.push(normalized);
        }
    }

    valid_paths
}

/// Checks whether an instance is already running on `SINGLE_INSTANCE_PORT`.
/// If running: connects, forwards `file_args`, and returns `SingleInstanceResult::Forwarded`.
/// If not running: binds port and returns `SingleInstanceResult::Primary`.
pub fn check_or_forward_instance(file_args: &[String]) -> SingleInstanceResult {
    match TcpListener::bind(("127.0.0.1", SINGLE_INSTANCE_PORT)) {
        Ok(listener) => SingleInstanceResult::Primary(SingleInstanceServer { listener }),
        Err(_) => {
            // Already running instance detected — connect and forward
            if let Ok(mut stream) = TcpStream::connect_timeout(
                &std::net::SocketAddr::from(([127, 0, 0, 1], SINGLE_INSTANCE_PORT)),
                Duration::from_millis(500),
            ) {
                if let Ok(payload) = serde_json::to_vec(file_args) {
                    let _ = stream.write_all(&payload);
                    let _ = stream.flush();
                }
            }
            SingleInstanceResult::Forwarded
        }
    }
}
