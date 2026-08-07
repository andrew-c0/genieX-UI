use super::AppState;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tokio::process::Command;

/// Status of the GenieX serve process.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    pub running: bool,
    pub port: u16,
    pub models: Vec<String>,
}

/// Probe the server's `/v1/models` endpoint to check if it's alive.
async fn probe_server(port: u16) -> bool {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .unwrap_or_default();

    client
        .get(format!("http://127.0.0.1:{port}/v1/models"))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

/// Start the `geniex serve` process in the background.
#[tauri::command]
pub async fn start_server(
    app: AppHandle,
    state: State<'_, AppState>,
    port: Option<u16>,
) -> Result<ServerStatus, String> {
    let serve_port = port.unwrap_or(18181);

    // First, check if a server is already running on the port (externally or by us)
    if probe_server(serve_port).await {
        return get_server_status(state, port).await;
    }

    // Check if we have a tracked process
    {
        let is_running = {
            let proc = state.server_process.lock().unwrap();
            proc.is_some()
        };
        if is_running {
            return get_server_status(state, port).await;
        }
    }

    let host = format!("127.0.0.1:{serve_port}");
    let args = vec!["serve".to_string(), "--host".into(), host];

    let child = Command::new("geniex")
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                "GenieX CLI not found. Ensure `geniex` is installed and in your PATH.".to_string()
            } else {
                format!("Failed to start `geniex serve`: {e}")
            }
        })?;

    let pid = child.id().unwrap_or(0);

    {
        let mut proc = state.server_process.lock().unwrap();
        *proc = Some(pid);
    }

    let mut child_for_logging = child;
    if let Some(stdout) = child_for_logging.stdout.take() {
        let app_handle_stdout = app.clone();
        tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = app_handle_stdout.emit("server-log", serde_json::json!({
                    "stream": "stdout",
                    "message": line
                }));
            }
        });
    }

    if let Some(stderr) = child_for_logging.stderr.take() {
        let app_handle_stderr = app.clone();
        tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = app_handle_stderr.emit("server-log", serde_json::json!({
                    "stream": "stderr",
                    "message": line
                }));
            }
        });
    }

    let app_handle2 = app.clone();
    tokio::spawn(async move {
        let _ = child_for_logging.wait().await;
        let _ = app_handle2.emit("server-stopped", ());
    });

    // Poll for readiness instead of a fixed sleep.
    // The server may take varying amounts of time to bind the port.
    for _ in 0..15 {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        if probe_server(serve_port).await {
            return get_server_status(state, port).await;
        }
    }

    // Timed out — still report current status (may be running but slow)
    get_server_status(state, port).await
}

/// Stop the running `geniex serve` process.
#[tauri::command]
pub async fn stop_server(state: State<'_, AppState>, port: Option<u16>) -> Result<ServerStatus, String> {
    let serve_port = port.unwrap_or(18181);
    let pid = {
        let mut proc = state.server_process.lock().unwrap();
        proc.take()
    };

    if let Some(pid) = pid {
        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F", "/T"])
                .output()
                .await;
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = Command::new("kill")
                .arg("-9")
                .arg(pid.to_string())
                .output()
                .await;
        }
    }

    Ok(ServerStatus {
        running: false,
        port: serve_port,
        models: vec![],
    })
}

/// Check if the GenieX server is healthy by hitting the models endpoint.
/// Works regardless of whether we spawned the server or it's running externally.
#[tauri::command]
pub async fn get_server_status(_state: State<'_, AppState>, port: Option<u16>) -> Result<ServerStatus, String> {
    let serve_port = port.unwrap_or(18181);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .unwrap_or_default();

    match client
        .get(format!("http://127.0.0.1:{serve_port}/v1/models"))
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.unwrap_or_default();
            let models = body["data"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|m| m["id"].as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();

            Ok(ServerStatus {
                running: true,
                port: serve_port,
                models,
            })
        }
        _ => Ok(ServerStatus {
            running: false,
            port: serve_port,
            models: vec![],
        }),
    }
}