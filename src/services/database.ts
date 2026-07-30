import Database from "@tauri-apps/plugin-sql";
import type { ChatSession, Message } from "../types";

const DB_PATH = "sqlite:geniex.db";

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load(DB_PATH);
  }
  return db;
}

// ─── Sessions ────────────────────────────────────────────────────

export async function loadSessions(): Promise<ChatSession[]> {
  const d = await getDb();
  const rows: any[] = await d.select(
    "SELECT * FROM chat_sessions ORDER BY updated_at DESC"
  );

  const sessions: ChatSession[] = [];
  for (const row of rows) {
    const messages = (await d.select(
      "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC",
      [row.id]
    )) as any[];
    sessions.push({
      id: row.id,
      title: row.title,
      modelId: row.model_id,
      contextChars: row.context_chars ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        modelId: m.model_id,
        timestamp: m.created_at,
      })),
    });
  }
  return sessions;
}

export async function saveSession(session: ChatSession): Promise<void> {
  const d = await getDb();
  await d.execute(
    `INSERT OR REPLACE INTO chat_sessions (id, title, model_id, context_chars, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [session.id, session.title, session.modelId ?? null, session.contextChars ?? 0, session.createdAt, session.updatedAt]
  );
}

export async function deleteSession(id: string): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM messages WHERE session_id = ?", [id]);
  await d.execute("DELETE FROM chat_sessions WHERE id = ?", [id]);
}

export async function deleteMessage(id: string): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM messages WHERE id = ?", [id]);
}

// ─── Messages ────────────────────────────────────────────────────

export async function saveMessage(
  sessionId: string,
  message: Message
): Promise<void> {
  const d = await getDb();
  await d.execute(
    `INSERT OR REPLACE INTO messages (id, session_id, role, content, model_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [message.id, sessionId, message.role, message.content, message.modelId ?? null, message.timestamp]
  );
  // Touch session's updated_at
  await d.execute(
    "UPDATE chat_sessions SET updated_at = ? WHERE id = ?",
    [Date.now(), sessionId]
  );
}

// ─── Model Settings ──────────────────────────────────────────────

export async function loadModelSettings(
  modelId: string
): Promise<string | null> {
  const d = await getDb();
  const rows: any[] = await d.select(
    "SELECT settings FROM model_settings WHERE model_id = ?",
    [modelId]
  );
  return rows[0]?.settings ?? null;
}

export async function saveModelSettings(
  modelId: string,
  settings: string
): Promise<void> {
  const d = await getDb();
  await d.execute(
    `INSERT OR REPLACE INTO model_settings (model_id, settings, updated_at)
     VALUES (?, ?, ?)`,
    [modelId, settings, Date.now()]
  );
}

// ─── User Preferences ──────────────────────────────────────────

export async function getPreference<T = string>(key: string): Promise<T | null> {
  const d = await getDb();
  const rows: any[] = await d.select(
    "SELECT value, type FROM user_preferences WHERE key = ?",
    [key]
  );
  if (!rows[0]) return null;
  const raw: string = rows[0].value;
  const type: string = rows[0].type;
  switch (type) {
    case "number":
      return Number(raw) as T;
    case "boolean":
      return (raw === "true") as T;
    case "json":
      return JSON.parse(raw) as T;
    default:
      return raw as T;
  }
}

export async function setPreference(
  key: string,
  value: unknown,
  type: string = "string"
): Promise<void> {
  const d = await getDb();
  const strValue = typeof value === "string" ? value : JSON.stringify(value);
  await d.execute(
    "INSERT OR REPLACE INTO user_preferences (key, value, type) VALUES (?, ?, ?)",
    [key, strValue, type]
  );
}
