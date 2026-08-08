# LocalGenie — Database Architecture

## Stack
- **sea-orm 1.1** ORM with `sqlx-sqlite` + `runtime-tokio` features
- **sea-orm-migration** for versioned migrations with up/down support
- **SQLite** database at `%APPDATA%/com.geniex.ui/geniex.db`

## Database Layer
- Entities in `src/entities/` (chat_session, message, model_setting, user_preference)
- Migrations in `src/migrations/` (use `DeriveMigrationName` + `MigrationTrait`)
- sea-orm uses `seaql_migrations` table to track applied migrations
- At startup: `Migrator::up(&db, None)` runs all pending migrations
- State type: `DatabaseConnection` (not `SqlitePool`)
- Upserts use `OnConflict::column().update_columns()` pattern
- PRAGMA foreign_keys enabled per-connection after connect

## Tables
| Table | Purpose |
|---|---|
| `chat_sessions` | Chat session metadata (id, title, created_at, updated_at, model, context_chars) |
| `messages` | Messages per session (id, session_id FK, role, content, timestamp) — CASCADE on delete |
| `model_settings` | Per-model generation params stored as JSON (model_name PK, settings_json, updated_at) |
| `user_preferences` | Key-value store for app settings (key PK, value, type) — currently stores `server_port` |

## Adding a New Migration
1. Create `src-tauri/src/migrations/m{YYYYMMDD}_{name}.rs`
2. Implement `MigrationTrait` with `up()` and `down()` methods
3. Register in `src/migrations/mod.rs` in the `Migrator::migrations()` vec

## Key Patterns
- Tauri commands accept `tauri::State<'_, DatabaseConnection>`
- Frontend calls via `invoke()` from `@tauri-apps/api/core`
- serde flatten on `ChatSessionWithMessages` spreads session fields
- Tauri 2 auto-applies `rename_all = "camelCase"` to top-level command params