# LocalGenie — Project Quick Reference

- **Stack**: Tauri 2 + React 19 + TypeScript + Fluent UI v9 + Zustand 5 + SQLite (sea-orm)
- **Rust backend**: src-tauri/src/commands/ (chat.rs, server.rs, models.rs, database.rs)
- **Entities**: src/entities/ (chat_session, message, model_setting, user_preference) — sea-orm models
- **Migrations**: src/migrations/ — versioned with up/down support, tracked via `seaql_migrations`
- **Frontend services**: src/services/ (geniex.ts = IPC wrappers, database.ts = IPC wrappers for DB)
- **Stores**: src/stores/ (chatStore.ts, modelStore.ts)
- **Components**: src/components/ (Sidebar, Header, ChatArea, ChatInput, MessageBubble, ModelBrowser, ModelSelector, SettingsDrawer, AppSettings, ModelSettings, WelcomeScreen)
- **DB**: sea-orm 1.1 with `sqlx-sqlite` + `runtime-tokio`; state type is `DatabaseConnection`
- **Port**: Configurable via Settings ? App tab, stored in user_preferences table, default 18181
- **Fluent UI imports**: Use `@fluentui/react-components` for all components. Toast API: `dispatchToast(<Toast><ToastTitle>...</ToastTitle></Toast>, { intent })` — NOT the `toast()` helper
- **Frontend ? DB flow**: database.ts uses `invoke()` to call Rust commands in database.rs