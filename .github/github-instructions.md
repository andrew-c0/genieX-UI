# LocalGenie — Project Documentation

## What the App Is Supposed to Do

LocalGenie is a **desktop GUI for Qualcomm's GenieX CLI**, designed to be an [LM Studio](https://lmstudio.ai/)-like interface for running local LLMs and VLMs on Qualcomm hardware (Snapdragon X Elite / Plus with Hexagon NPU, Adreno GPU, or CPU).

The envisioned workflow:

1. **Browse & pull models** from Hugging Face (GGUF) or Qualcomm AI Hub (pre-compiled bundles with NPU/GPU quantizations).
2. **Start a local inference server** (`geniex serve`) that exposes an OpenAI-compatible HTTP API.
3. **Load a model** into the server for inference.
4. **Chat** with the model in a streaming, Markdown-rendered conversation UI with per-model generation settings.
5. **Manage chat history** — persistent sessions stored in SQLite, with auto-titling and context tracking.

In short: a polished, self-contained desktop app that makes it trivial to run frontier-class models locally on Qualcomm AI hardware.

---

## What It Actually Does (Current State)

### Working Features ✅

| Feature | Status |
|---|---|
| **Tauri 2 desktop shell** | App builds and launches successfully |
| **Sidebar with chat history** | Sessions create, delete, switch; persisted to SQLite |
| **Model Browser dialog** | Lists installed models via `geniex list --format json`; searches Hugging Face; pull/remove actions |
| **Model Pull with progress** | `geniex pull` spawns in background; progress events stream to UI |
| **Server Start/Stop** | Spawns `geniex serve --host 127.0.0.1:{port}` (configurable); probes health via `/v1/models`; kills on exit |
| **Model Selector sidebar** | Shows all installed models with per-model Load button; server status indicator |
| **Settings Drawer** | Split into **App** and **Model** tabs. App tab: configurable server port (1024–65535) with availability check, persisted to `user_preferences` DB table. Model tab: per-model temperature, top-p, top-k, min-p, repetition penalty, max tokens, nctx, system prompt, think toggle. Settings button moved to sidebar footer. |
| **Chat Input** | Sends messages with per-model settings; context character counter; retry support |
| **Rust backend** | All commands compile cleanly; SSE streaming parser; precision suffix stripping |
| **Auto model detection** | Falls back to querying `/v1/models` for first available model if none selected |

### Broken / Non-Functional ❌

| Feature | Status |
|---|---|
| **Model Loading** | **Completely non-functional.** The warmup request (`POST /v1/chat/completions` with `max_tokens:1`) is sent correctly, but the GenieX server never responds. Model loading on NPU takes minutes; the server blocks all HTTP during load. Despite increasing the timeout to 600s, the model never loads. |
| **Chat Responses** | **Never received.** Depends on model loading working first. The server hangs during model load, so no chat completions complete. |
| **Model Unload** | Implemented as server kill (no per-model unload endpoint exists in GenieX CLI). |
| **Generation Stats** | TTFT, total time, token count are tracked in code but never displayed — no stats UI exists. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        LocalGenie Desktop                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─── Frontend (React 19 + TypeScript) ──────────────────────┐  │
│  │  Vite 6 dev server (port 1420)                            │  │
│  │  Fluent UI React v9 components                            │  │
│  │  Zustand state management                                 │  │
│  │  Markdown rendering (react-markdown + remark-gfm +        │  │
│  │    rehype-highlight)                                       │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
│                        │ IPC (Tauri invoke + events)             │
│  ┌─── Rust Backend (Tauri 2) ───────────────────────────────┐  │
│  │  Commands:                                                │  │
│  │    • model management (list, pull, remove, search)        │  │
│  │    • server management (start, stop, status)              │  │
│  │    • chat (load_model, chat_completion, unload_all)       │  │
│  │  Plugins: tauri-plugin-shell, tauri-plugin-sql (SQLite)   │  │
│  │  HTTP client: reqwest (json + streaming)                  │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
│                        │ HTTP (localhost:{port})                 │
│                        │ default 18181, configurable via DB     │
│  ┌─── GenieX Server (external process) ─────────────────────┐  │
│  │  `geniex serve --host 127.0.0.1:{port}`                  │  │
│  │  OpenAI-compatible REST API:                              │  │
│  │    • GET  /v1/models          (list cached models)        │  │
│  │    • POST /v1/chat/completions (chat with SSE streaming)  │  │
│  │  Lazy model loading on first chat request                 │  │
│  │  Runs on Hexagon NPU / Adreno GPU / CPU                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **App init** → Load sessions from DB → List models → Load `server_port` preference from DB → Set port in store → Probe server status on that port
2. **User clicks Load** → Frontend calls `loadModel()` → Rust sends warmup `POST /v1/chat/completions` → server loads model lazily → (should) return → Rust refreshes `/v1/models` → returns `ServerStatus`
3. **User sends message** → Frontend calls `chatCompletion()` → Rust builds OpenAI-compatible JSON with sampling params → `POST /v1/chat/completions` with `stream: true` → SSE chunks emitted as `chat-chunk` events → frontend appends to assistant message → `chat-done` on completion
4. **Model pull** → Frontend calls `pullModel()` → Rust spawns `geniex pull` → stdout lines emitted as `model-pull-progress` events → UI shows download progress
5. **Server lifecycle** → `start_server` probes first, then spawns `geniex serve` (on configured port) → PID tracked in `AppState` → `on_window_event(Destroyed)` kills process on app exit
6. **Settings save** → AppSettings: saves port to `user_preferences` DB table, updates store, probes server on new port. ModelSettings: saves generation settings JSON to `model_settings` table per model.

### State Management

- **Zustand stores**: `chatStore` (sessions, active session, streaming state), `modelStore` (models, server status, **`serverPort`**, downloads, search results)
- **SQLite via tauri-plugin-sql**: `chat_sessions`, `messages`, `model_settings`, **`user_preferences`** (key-value store for app settings like server port) tables — all persisted locally at `sqlite:geniex.db`
- **Generation settings**: Per-model, stored as JSON in `model_settings` table, loaded when model is selected
- **App preferences**: Stored in `user_preferences` table as `(key TEXT PK, value TEXT, type TEXT)`. Currently stores `server_port` (type `number`). Loaded on app init and applied before probing server status.

---

## Folder Structure

```
LocalGenie/
├── .github/
│   └── github-instructions.md    ← This file
├── src/                           ← React frontend
│   ├── App.tsx                    ← Root component, event listeners, DB persistence
│   ├── App.css                    ← All styles (~639 lines, dark theme)
│   ├── main.tsx                   ← ReactDOM entry point
│   ├── theme.ts                   ← Fluent UI dark theme tokens
│   ├── vite-env.d.ts              ← Vite type declarations
│   ├── components/
│   │   ├── Sidebar.tsx            ← Chat history list, new chat, ModelSelector embed
│   │   ├── Header.tsx             ← Top bar with session title, settings button
│   │   ├── ChatArea.tsx           ← Message list, markdown rendering, generation stats
│   │   ├── ChatInput.tsx          ← Text input, send, context bar, retry
│   │   ├── MessageBubble.tsx      ← Individual message with role, content, copy button
│   │   ├── ModelSelector.tsx      ← Sidebar model list with Load buttons, server toggle
│   │   ├── ModelBrowser.tsx       ← Dialog for installed models + HF search/pull
│   │   ├── SettingsDrawer.tsx     ← Slim tabbed container (App / Model tabs), ~55 lines
│   │   ├── AppSettings.tsx        ← Server port config with availability probe + save + toast
│   │   ├── ModelSettings.tsx      ← Per-model generation settings (sliders, toggles) + save + toast
│   │   └── WelcomeScreen.tsx      ← Empty state with tips and quick-start actions
│   ├── services/
│   │   ├── geniex.ts              ← All Tauri IPC invoke wrappers
│   │   └── database.ts            ← SQLite CRUD via tauri-plugin-sql
│   ├── stores/
│   │   ├── chatStore.ts           ← Zustand: sessions, messages, streaming state
│   │   └── modelStore.ts          ← Zustand: models, server status, downloads
│   └── types/
│       └── index.ts               ← All TypeScript interfaces (ModelInfo, Message, etc.)
├── src-tauri/                     ← Rust backend
│   ├── Cargo.toml                 ← Rust dependencies (tauri 2, reqwest, tokio, etc.)
│   ├── tauri.conf.json            ← Tauri config (window, CSP, plugins)
│   ├── build.rs                   ← Tauri build script
│   ├── capabilities/
│   │   └── default.json           ← Tauri v2 capability permissions
│   └── src/
│       ├── main.rs                ← Entry point (calls lib::run())
│       ├── lib.rs                 ← Tauri builder, plugin registration, command handlers
│       └── commands/
│           ├── mod.rs             ← AppState struct (server PID tracker)
│           ├── models.rs          ← list_models, pull_model, remove_model, search_models
│           ├── server.rs          ← start_server, stop_server, get_server_status
│           ├── chat.rs            ← load_model, chat_completion, unload_all_models
│           └── database.rs        ← SQLite migration definitions
├── index.html                     ← Vite HTML entry
├── package.json                   ← Node dependencies and scripts
├── tsconfig.json                  ← TypeScript config
├── tsconfig.node.json             ← TypeScript config for Vite/Node
├── vite.config.ts                 ← Vite config with React plugin
└── README.md                      ← Project readme
```

---

## Notable Mentions

### GenieX Server Quirks

- **Lazy model loading**: The server does NOT load models when `geniex serve` starts. Models are loaded on-demand when the first `POST /v1/chat/completions` request arrives for that model.
- **Single-threaded during load**: While a model is loading, the server blocks ALL HTTP responses. `GET /v1/models`, health probes, and all other requests hang with no data until loading completes.
- **NPU loading takes minutes**: Loading a model on the Hexagon NPU can take several minutes (tested >130s without completion). There is no progress API — the server simply blocks until done.
- **No explicit load/unload endpoints**: There are no `POST /v1/models/{id}/load` or `/unload` endpoints. The only way to trigger loading is via a chat completion request. The only way to unload is to kill the server.
- **Model name precision suffix**: `/v1/models` returns model names WITH precision (e.g., `qualcomm/Qwen3-4B-Instruct-2507:W4A16`), but `/v1/chat/completions` requires names WITHOUT precision (e.g., `qualcomm/Qwen3-4B-Instruct-2507`). The server auto-selects the quantization.

### Build & Dev Notes

- **npm scripts**: `"start"` and `"dev"` both run `tauri dev` (Vite + Rust compile + app launch). `"build"` runs `tauri build` for production.
- **Port 1420**: Vite dev server. **Port 18181** (default): GenieX inference server — configurable via Settings → App tab, persisted in `user_preferences` DB table.
- **SQLite DB**: Stored at `%APPDATA%/com.geniex.ui/geniex.db`. Migrations run on startup via tauri-plugin-sql (v1: core tables, v2: `user_preferences`).
- **CSP**: Content Security Policy restricts connections to `127.0.0.1:*` (for the GenieX server).
- **Cargo profile**: Release builds use LTO, single codegen unit, abort on panic, size-optimized.
- **Binary**: `geniex` CLI must be on PATH. The app spawns it for serve, list, pull, and remove operations.

### UI Design

- **Dark theme**: Deep purple/navy color scheme (#1a1a2e base) matching Qualcomm AI Hub branding.
- **Fluent UI React v9**: Microsoft's design system — provides consistent buttons, dialogs, drawers, sliders, badges, tooltips, spinners, message bars.
- **Markdown rendering**: Assistant messages render Markdown with GFM tables, strikethrough, task lists, and syntax-highlighted code blocks.
- **LM Studio-inspired layout**: Sidebar (chat history + model selector) | Main area (messages + input).

---

## Shortcomings

### Critical

1. **Model loading is completely broken.** The warmup chat completion request is sent correctly to the server, but the model never loads. This blocks the entire core workflow (load → chat). The root cause is likely one of:
   - The GenieX server requires specific compute flags (`--compute npu`, etc.) to enable model loading.
   - The warmup request format (`max_tokens:1, stream:false`) doesn't properly trigger lazy loading on the server.
   - The server binary or model binaries are not in the expected location when spawned by the app.
   - Model loading on NPU genuinely takes >600s and the timeout is still insufficient.

2. **No chat responses are ever received.** This is a direct consequence of #1 — the server blocks during model loading, so the SSE stream in `chat_completion` never receives data.

### Major

3. **No real-time loading progress.** The GenieX server provides no API to check model loading progress. During the minutes-long load process, the UI can only show a static "Loading…" spinner with no ETA, no percentage, no status updates.

4. **No model unload without killing the server.** The only way to free model memory is to kill the entire `geniex serve` process. There's no per-model unload API.

5. **Server blocks during model load.** While loading, the server cannot respond to ANY HTTP requests — including health checks. The app's `probe_server` function will timeout, making it impossible to distinguish "loading" from "dead."

### Minor

6. **Fluent UI toast notifications don't appear after settings save.** Both AppSettings and ModelSettings dispatch toasts via `useToastController("app-toaster")` with `<Toast><ToastTitle>` JSX pattern (the correct Fluent UI v9 API). The `<Toaster>` is rendered at app root with matching `toasterId`. Toasts may be hidden behind the Drawer's z-index overlay — `.fui-Toaster` z-index was bumped to 100000 but still doesn't work. Root cause unresolved.

7. **Generation stats (TTFT, token count, total time) are computed but never displayed** in the UI. The data is there but no component renders it.

8. **No error recovery for failed model loads.** If `load_model` times out or errors, the UI may be stuck in a loading state with no way to retry other than clicking Load again.

9. **Server PID tracking is fragile.** If the user starts GenieX server externally (not via the app), the app cannot kill it on exit — `AppState.server_process` is `None`.

10. **No GPU/NPU selection UI.** The app doesn't expose `geniex serve`'s `--compute` flag, so users can't choose between NPU, GPU, or CPU from the interface. The server decides automatically (or defaults to CPU).

11. **No streaming backpressure handling.** If the frontend is slow to process SSE chunks, the Rust backend buffers them in memory without any flow control.

12. **HF search has no pagination or filtering.** Results are limited to 20 with no way to sort or filter beyond the initial query.

13. **No model comparison or multi-model chat.** Only one model can be active per session, with no ability to compare outputs from different models side-by-side.

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Desktop framework | Tauri 2.11 |
| Frontend framework | React 19 + TypeScript 5.8 |
| UI components | Fluent UI React v9 |
| Build tool | Vite 6 |
| State management | Zustand 5 |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| Backend language | Rust (edition 2021) |
| HTTP client | reqwest 0.12 (json + streaming) |
| Async runtime | Tokio (full) |
| Database | SQLite via tauri-plugin-sql |
| Inference server | GenieX CLI (`geniex serve`) — OpenAI-compatible API |

---

---

## Repo Memory Files

These files in `memories/repo/` provide concise, up-to-date context for AI assistants working on this codebase:

| File | Contents |
|---|---|
| [`project-overview.md`](../../memories/repo/project-overview.md) | Stack summary, folder layout, key conventions, DB layer overview |
| [`db-architecture.md`](../../memories/repo/db-architecture.md) | Database schema, entities, migrations, key ORM patterns |
| [`known-issues.md`](../../memories/repo/known-issues.md) | Active bugs, resolved issues, and project notes |
| [`code-quality.md`](../../memories/repo/code-quality.md) | Completed code-quality work, DX improvements, remaining items |

---

*Last updated: 2026-08-08 (brand rename to LocalGenie)*
