mod commands;

use tauri::Manager;
use commands::models;
use commands::server;
use commands::chat;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:geniex.db", vec![commands::database::migration(), commands::database::migration_v2()])
                .build(),
        )
        .manage(commands::AppState::default())
        .invoke_handler(tauri::generate_handler![
            // Model management
            models::list_models,
            models::pull_model,
            models::remove_model,
            models::search_models,
            // Server management
            server::start_server,
            server::stop_server,
            server::get_server_status,
            // Chat
            chat::chat_completion,
            chat::load_model,
            chat::unload_all_models,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<commands::AppState>();
                let pid = {
                    let mut proc = state.server_process.lock().unwrap();
                    proc.take()
                };
                if let Some(pid) = pid {
                    #[cfg(target_os = "windows")]
                    {
                        let _ = std::process::Command::new("taskkill")
                            .args(["/PID", &pid.to_string(), "/F", "/T"])
                            .output();
                    }
                    #[cfg(not(target_os = "windows"))]
                    {
                        let _ = std::process::Command::new("kill")
                            .arg("-9")
                            .arg(pid.to_string())
                            .output();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running GenieX-UI");
}
