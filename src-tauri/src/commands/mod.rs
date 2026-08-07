pub mod chat;
pub mod database;
pub mod models;
pub mod server;

use std::sync::Mutex;

/// Shared application state managed by Tauri.
pub struct AppState {
    /// Handle to the running `geniex serve` child process.
    pub server_process: Mutex<Option<u32>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            server_process: Mutex::new(None),
        }
    }
}
