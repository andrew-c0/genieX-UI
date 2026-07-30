import { invoke } from "@tauri-apps/api/core";
import type {
  GenerationSettings,
  ModelInfo,
  SearchModel,
  ServerStatus,
} from "../types";

/** Shape sent to the OpenAI-compatible chat completions endpoint. */
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// ─── Model Management ────────────────────────────────────────────

export async function listModels(): Promise<ModelInfo[]> {
  return invoke("list_models");
}

export async function pullModel(
  model: string,
  precision?: string,
  modelHub?: string
): Promise<void> {
  return invoke("pull_model", { model, precision, modelHub });
}

export async function removeModel(model: string): Promise<void> {
  return invoke("remove_model", { model });
}

export async function searchModels(query: string): Promise<SearchModel[]> {
  return invoke("search_models", { query });
}

// ─── Server Management ───────────────────────────────────────────

export async function startServer(
  port?: number
): Promise<ServerStatus> {
  return invoke("start_server", { port });
}

export async function stopServer(
  port?: number
): Promise<ServerStatus> {
  return invoke("stop_server", { port });
}

export async function getServerStatus(
  port?: number
): Promise<ServerStatus> {
  return invoke("get_server_status", { port });
}

// ─── Model Loading ──────────────────────────────────────────────

export async function loadModel(
  model: string,
  baseUrl?: string
): Promise<ServerStatus> {
  return invoke("load_model", { model, baseUrl });
}

export async function unloadAllModels(): Promise<ServerStatus> {
  return invoke("unload_all_models");
}

// ─── Chat ────────────────────────────────────────────────────────

export async function chatCompletion(
  messages: ChatMessage[],
  settings: GenerationSettings,
  model?: string,
  baseUrl?: string
): Promise<void> {
  return invoke("chat_completion", { messages, settings, model, baseUrl });
}
