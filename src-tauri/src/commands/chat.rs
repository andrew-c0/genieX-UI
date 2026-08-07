use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

/// A single message in the chat.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Sampler / generation settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationSettings {
    pub temperature: Option<f64>,
    pub top_p: Option<f64>,
    pub top_k: Option<u32>,
    pub min_p: Option<f64>,
    pub repetition_penalty: Option<f64>,
    pub max_tokens: Option<u32>,
    pub nctx: Option<u32>,
    pub system_prompt: Option<String>,
    pub think: Option<bool>,
}

/// Strip precision suffix from a model name.
/// e.g. "qualcomm/Qwen3-4B-Instruct-2507:W4A16" -> "qualcomm/Qwen3-4B-Instruct-2507"
fn strip_precision(name: &str) -> &str {
    match name.rfind(':') {
        Some(pos) => &name[..pos],
        None => name,
    }
}

/// Resolve the model name to send to the server.
/// The chat server expects "org/repo" WITHOUT precision suffix.
fn resolve_model_for_server(model: Option<&str>) -> Option<String> {
    match model {
        Some(m) if !m.is_empty() => {
            let clean = strip_precision(m);
            eprintln!("[chat] model resolved: input={:?} -> clean={}", m, clean);
            Some(clean.to_string())
        }
        _ => {
            eprintln!("[chat] no model provided or empty string");
            None
        }
    }
}

/// Fetch the first loaded model from the server's /v1/models endpoint.
async fn fetch_first_loaded_model(base_url: &str) -> Option<String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .ok()?;

    let url = format!("{}/v1/models", base_url);
    let resp = client.get(&url).send().await.ok()?;
    let body: serde_json::Value = resp.json().await.ok()?;

    let model_id = body["data"]
        .as_array()?
        .first()?
        .get("id")?
        .as_str()?
        .to_string();

    eprintln!("[chat] fetched loaded model from server: {}", model_id);
    // The /v1/models returns with precision, strip it
    Some(strip_precision(&model_id).to_string())
}

/// Load a model into the GenieX server by sending a minimal chat request.
/// The server loads models on-demand; this warmup triggers that loading.
/// Returns the refreshed ServerStatus after loading completes.
#[tauri::command]
pub async fn load_model(
    model: String,
    base_url: Option<String>,
) -> Result<super::server::ServerStatus, String> {
    let resolved_base = base_url.unwrap_or_else(|| "http://127.0.0.1:18181".into());
    let clean_model = strip_precision(&model);

    eprintln!("[load] loading model '{}' (stripped: '{}')", model, clean_model);

    // Parse port from the base URL for the returned status
    let port: u16 = resolved_base
        .rsplit(':')
        .next()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(18181);

    let url = format!("{}/v1/chat/completions", resolved_base);
    let body = serde_json::json!({
        "model": clean_model,
        "messages": [{"role": "user", "content": "hi"}],
        "max_tokens": 1,
        "stream": false,
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to server at {url}: {e}"))?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        eprintln!("[load] server error: {} {}", status, text);
        return Err(format!("Server returned {status}: {text}"));
    }

    eprintln!("[load] model '{}' loaded successfully", clean_model);

    // Refresh server status to reflect newly loaded models
    let status_resp = client
        .get(format!("{}/v1/models", resolved_base))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models: {e}"))?;

    let body: serde_json::Value = status_resp.json().await.unwrap_or_default();
    let models: Vec<String> = body["data"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|m| m["id"].as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    // Verify the model actually appears in the loaded list
    let found = models.iter().any(|m| {
        m == clean_model || m.starts_with(&format!("{}:", clean_model))
    });
    if !found {
        return Err(format!(
            "Model '{}' does not appear loaded on the server. Loaded models: {:?}",
            clean_model, models
        ));
    }

    Ok(super::server::ServerStatus {
        running: true,
        port,
        models,
    })
}

/// Unload all models by stopping the GenieX server.
/// The server has no per-model unload endpoint, so this is the only option.
#[tauri::command]
pub async fn unload_all_models(
    state: tauri::State<'_, super::AppState>,
    port: Option<u16>,
) -> Result<super::server::ServerStatus, String> {
    eprintln!("[unload] stopping server to unload all models");
    super::server::stop_server(state, port).await
}

/// Stream a chat completion from the GenieX OpenAI-compatible API.
/// Emits `chat-chunk` events for each streamed token, and `chat-done` when finished.
#[tauri::command]
pub async fn chat_completion(
    app: AppHandle,
    messages: Vec<ChatMessage>,
    settings: GenerationSettings,
    model: Option<String>,
    base_url: Option<String>,
) -> Result<(), String> {
    let resolved_base = base_url.unwrap_or_else(|| "http://127.0.0.1:18181".into());
    let url = format!("{}/v1/chat/completions", resolved_base);

    eprintln!(
        "[chat] called: model={:?}, messages={}, url={}",
        model,
        messages.len(),
        url
    );

    let mut messages_json: Vec<serde_json::Value> = messages
        .iter()
        .map(|m| {
            serde_json::json!({
                "role": m.role,
                "content": m.content
            })
        })
        .collect();

    // Prepend system prompt if provided
    if let Some(sp) = &settings.system_prompt {
        if !sp.is_empty() {
            messages_json.insert(
                0,
                serde_json::json!({
                    "role": "system",
                    "content": sp
                }),
            );
        }
    }

    let mut body = serde_json::json!({
        "messages": messages_json,
        "stream": true,
    });

    // Resolve model name — strip precision if present, or auto-detect from server
    let model_name = match resolve_model_for_server(model.as_deref()) {
        Some(name) => Some(name),
        None => fetch_first_loaded_model(&resolved_base).await,
    };

    if let Some(ref m) = model_name {
        body["model"] = serde_json::json!(m);
        eprintln!("[chat] sending model '{}' to server", m);
    } else {
        eprintln!("[chat] WARNING: no model resolved");
    }

    // Add optional sampling parameters
    if let Some(t) = settings.temperature {
        body["temperature"] = serde_json::json!(t);
    }
    if let Some(tp) = settings.top_p {
        body["top_p"] = serde_json::json!(tp);
    }
    if let Some(tk) = settings.top_k {
        body["top_k"] = serde_json::json!(tk);
    }
    if let Some(mp) = settings.min_p {
        body["min_p"] = serde_json::json!(mp);
    }
    if let Some(rp) = settings.repetition_penalty {
        body["repetition_penalty"] = serde_json::json!(rp);
    }
    if let Some(mt) = settings.max_tokens {
        body["max_tokens"] = serde_json::json!(mt);
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to GenieX server at {url}: {e}"))?;

    let status = response.status();
    eprintln!("[chat] server response status: {}", status);

    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        eprintln!("[chat] server error: {} {}", status, text);
        return Err(format!("Server returned {status}: {text}"));
    }

    // Stream the SSE response
    use futures_util::StreamExt;

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut full_response = String::new();
    let mut chunk_count: u32 = 0;

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream error: {e}"))?;
        let text = String::from_utf8_lossy(&chunk);
        buffer.push_str(&text);

        // Process complete SSE lines
        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            if let Some(data) = trimmed.strip_prefix("data:") {
                let data = data.trim();
                if data == "[DONE]" {
                    eprintln!("[chat] stream complete: {} chunks, {} chars", chunk_count, full_response.len());
                    let _ = app.emit("chat-done", serde_json::json!({
                        "full_response": full_response,
                    }));
                    return Ok(());
                }

                // Parse the SSE JSON chunk
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(choices) = parsed["choices"].as_array() {
                        for choice in choices {
                            if let Some(delta) = choice.get("delta") {
                                if let Some(content) = delta["content"].as_str() {
                                    if !content.is_empty() {
                                        full_response.push_str(content);
                                        chunk_count += 1;
                                        let _ = app.emit("chat-chunk", serde_json::json!({
                                            "content": content,
                                        }));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // If we get here without [DONE], still emit done
    eprintln!("[chat] stream ended without [DONE]: {} chunks, {} chars", chunk_count, full_response.len());
    let _ = app.emit("chat-done", serde_json::json!({
        "full_response": full_response,
    }));

    Ok(())
}