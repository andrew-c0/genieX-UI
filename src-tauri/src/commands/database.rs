use tauri_plugin_sql::{Migration, MigrationKind};

/// Returns the SQLite migrations for the initial schema and upgrades.
pub fn migration() -> Migration {
    Migration {
        version: 1,
        description: "create_initial_tables",
        sql: "
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                model_id TEXT,
                context_chars INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                model_id TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS model_settings (
                model_id TEXT PRIMARY KEY,
                settings TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_updated ON chat_sessions(updated_at DESC);
        ",
        kind: MigrationKind::Up,
    }
}

pub fn migration_v2() -> Migration {
    Migration {
        version: 2,
        description: "create_user_preferences",
        sql: "
            CREATE TABLE IF NOT EXISTS user_preferences (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'string'
            );
        ",
        kind: MigrationKind::Up,
    }
}


