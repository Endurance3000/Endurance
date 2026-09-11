use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

pub const MINI_PLAYER_LABEL: &str = "mini-player";
pub const MINI_PLAYER_ROUTE: &str = "index.html?window=mini-player";
pub const MINI_PLAYER_TITLE: &str = "Endurance Mini Player";
pub const MINI_PLAYER_WIDTH: f64 = 420.0;
pub const MINI_PLAYER_HEIGHT: f64 = 180.0;
pub const MINI_PLAYER_MIN_WIDTH: f64 = 320.0;
pub const MINI_PLAYER_MIN_HEIGHT: f64 = 140.0;

#[tauri::command]
pub async fn open_mini_player(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window(MINI_PLAYER_LABEL) {
        window
            .unminimize()
            .map_err(|error| format!("Failed to restore Mini Player: {error}"))?;
        window
            .show()
            .map_err(|error| format!("Failed to show Mini Player: {error}"))?;
        window
            .set_focus()
            .map_err(|error| format!("Failed to focus Mini Player: {error}"))?;
        return Ok(());
    }

    let result = WebviewWindowBuilder::new(
        &app_handle,
        MINI_PLAYER_LABEL,
        WebviewUrl::App(MINI_PLAYER_ROUTE.into()),
    )
    .title(MINI_PLAYER_TITLE)
    .inner_size(MINI_PLAYER_WIDTH, MINI_PLAYER_HEIGHT)
    .min_inner_size(MINI_PLAYER_MIN_WIDTH, MINI_PLAYER_MIN_HEIGHT)
    .resizable(true)
    .decorations(true)
    .visible(true)
    .focused(true)
    .build();

    match result {
        Ok(_) => Ok(()),
        Err(error) => Err(format!("Failed to create Mini Player: {error}")),
    }
}

#[tauri::command]
pub fn set_mini_player_always_on_top(
    app_handle: AppHandle,
    always_on_top: bool,
) -> Result<(), String> {
    let window = app_handle
        .get_webview_window(MINI_PLAYER_LABEL)
        .ok_or_else(|| "Mini Player window is not open".to_string())?;

    window
        .set_always_on_top(always_on_top)
        .map_err(|error| format!("Failed to set Mini Player always-on-top: {error}"))
}

pub fn close_mini_player(app_handle: &AppHandle) {
    if let Some(window) = app_handle.get_webview_window(MINI_PLAYER_LABEL) {
        let _ = window.destroy();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mini_player_uses_stable_window_identity() {
        assert_eq!(MINI_PLAYER_LABEL, "mini-player");
        assert_eq!(MINI_PLAYER_ROUTE, "index.html?window=mini-player");
    }

    #[test]
    fn mini_player_has_compact_valid_dimensions() {
        assert!(MINI_PLAYER_WIDTH >= MINI_PLAYER_MIN_WIDTH);
        assert!(MINI_PLAYER_HEIGHT >= MINI_PLAYER_MIN_HEIGHT);
        assert!(MINI_PLAYER_MIN_WIDTH > 0.0);
        assert!(MINI_PLAYER_MIN_HEIGHT > 0.0);
    }
}