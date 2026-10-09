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
                        if !file_paths.is_empty() {
                            // Focus and restore main window
                            if let Some(main) = app_handle.get_webview_window("main") {
                                let _ = main.unminimize();
                                let _ = main.show();
                                let _ = main.set_focus();
                            }

                            // Store in pending queue as fallback
                            if let Ok(mut pending) = pending_files.lock() {
                                pending.extend(file_paths.clone());
                            }

                            // Emit live event to frontend
                            let _ = app_handle.emit(
                                "endurance://open-files",
                                OpenFilesPayload { file_paths },
                            );
                        }
                    }
                }
            }
        });
    }
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
