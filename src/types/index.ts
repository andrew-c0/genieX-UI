export interface ModelInfo {
  name: string;
  size: string;
  source: "hf" | "aihub" | "docker" | "localfs";
  precisions: string[];
}

export interface SearchModel {
  id: string;
  name: string;
  downloads?: number;
  likes?: number;
  tags?: string[];
  pipeline_tag?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  modelId?: string;
  stats?: GenerationStats;
}

export interface GenerationStats {
  /** ms from send to first token */
  timeToFirstToken: number;
  /** ms from send to completion */
  totalTime: number;
  /** number of token events received */
  tokenCount: number;
  /** characters in the user prompt that triggered this response */
  promptChars: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  modelId?: string;
  contextChars: number;
  createdAt: number;
  updatedAt: number;
}

export interface ServerStatus {
  running: boolean;
  port: number;
  models: string[];
}

export interface GenerationSettings {
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  repetitionPenalty?: number;
  maxTokens?: number;
  nctx?: number;
  systemPrompt?: string;
  think?: boolean;
}

export interface DownloadProgress {
  model: string;
  message: string;
  status: "downloading" | "complete" | "error";
}
