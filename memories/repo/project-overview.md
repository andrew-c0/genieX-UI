# GenieX-UI — Project Quick Reference

- **Stack**: Tauri 2 + React 19 + TypeScript + Fluent UI v9 + Zustand 5 + SQLite
- **Rust backend**: src-tauri/src/commands/ (chat.rs, server.rs, models.rs, database.rs)
- **Frontend services**: src/services/ (geniex.ts = IPC wrappers, database.ts = SQLite CRUD)
- **Stores**: src/stores/ (chatStore.ts, modelStore.ts)
- **Components**: src/components/ (Sidebar, Header, ChatArea, ChatInput, MessageBubble, ModelBrowser, ModelSelector, SettingsDrawer, AppSettings, ModelSettings, WelcomeScreen)
- **DB migrations**: database.rs → migration() v1 (core tables), migration_v2() (user_preferences)
- **Port**: Configurable via Settings → App tab, stored in user_preferences table, default 18181
- **Fluent UI imports**: Use `@fluentui/react-components` for all components. Toast API: `dispatchToast(<Toast><ToastTitle>...</ToastTitle></Toast>, { intent })` — NOT the `toast()` helper
