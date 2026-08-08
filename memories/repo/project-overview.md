# LocalGenie — Project Quick Reference

- **Stack**: Tauri 2 + React 19 + TypeScript + Fluent UI v9 + Zustand 5 + SQLite (sqlx)
- **Rust backend**: src-tauri/src/commands/ (chat.rs, server.rs, models.rs, database.rs)
- **Frontend services**: src/services/ (geniex.ts = IPC wrappers, database.ts = IPC wrappers for DB)
- **Stores**: src/stores/ (chatStore.ts, modelStore.ts)
- **Components**: src/components/ (Sidebar, Header, ChatArea, ChatInput, MessageBubble, ModelBrowser, ModelSelector, SettingsDrawer, AppSettings, ModelSettings, WelcomeScreen)
- **DB**: sqlx (Rust-side), schema created on startup via init_pool(), no plugin-sql dependency
- **DB structs**: DbChatSession, DbMessage (in database.rs), both FromRow + Serialize
- **Port**: Configurable via Settings → App tab, stored in user_preferences table, default 18181
- **Fluent UI imports**: Use `@fluentui/react-components` for all components. Toast API: `dispatchToast(<Toast><ToastTitle>...</ToastTitle></Toast>, { intent })` — NOT the `toast()` helper
- **Frontend → DB flow**: database.ts uses `invoke()` to call Rust commands in database.rs
