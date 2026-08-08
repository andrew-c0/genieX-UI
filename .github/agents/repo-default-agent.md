# repo-default-agent.md — LocalGenie Coding Guidelines

> Living document for all AI agents and contributors. Follow these rules for every
> change. If a rule conflicts with existing code, fix the existing code.

---

## Project Overview

**LocalGenie** is a Tauri 2 desktop app: Rust backend (`src-tauri/`) + React 19
frontend (`src/`). SQLite persistence via sea-orm, Zustand state management,
Fluent UI v9 component library, Vite build tooling, Biome linter/formatter.

---

## Frontend (React 19 + TypeScript)

### 1. Component Organization

| Rule | Detail |
|------|--------|
| **Reusable components → `src/components/`** | Any component used in 2+ places or clearly generic must live in `src/components/` and be imported by consumers. |
| **Page-specific components** | If a component is only used inside one page and is simple (< 80 LOC), keep it in the same file as the page. Otherwise, extract to `src/components/`. |
| **Component naming** | PascalCase filenames matching the export: `ModelBrowser.tsx` exports `ModelBrowser`. One component per file. |
| **Props typing** | Define a `Props` interface directly above the component. Use `type` for props, `interface` for data models. |
| **Default exports** | Each component file has exactly one default export. |

### 2. CSS Architecture

| Rule | Detail |
|------|--------|
| **Reusable CSS (colors, spacing, swatches, shared values)** | Define once in `src/App.css` using CSS custom properties (`--*`) or well-named utility classes. Reference from component-specific files. |
| **Non-reusable CSS (component/page-specific styles)** | Place in a co-located `.css` file named after the component: `ModelBrowser.css`, `WelcomeScreen.css`. Import at the top of the component file. |
| **No inline styles** | Use CSS classes exclusively. The only exception is CSS custom property values (`style={{ "--ctx-pct": ... }}`) that are dynamically set at runtime. |
| **CSS naming convention** | BEM-inspired flat classes: `ms-*` (Model Settings), `mb-*` (Model Browser), `sidebar-*`, etc. Prefix with the component's initials. |
| **Max line width** | 200 characters (Biome `lineWidth`). |

### 3. Page Size Limit

| Rule | Detail |
|------|--------|
| **Max 400 lines per page component** | `App.tsx`, page-level containers. If approaching the limit, extract sub-sections into dedicated components. |
| **Max 250 lines per reusable component** | If a component exceeds this, split into a parent + child composition. |
| **Extraction strategy** | Look for: repeated JSX blocks, complex conditional rendering, event handlers with logic, sub-views with distinct responsibility. Extract each into its own component. |

### 4. State Management

| Rule | Detail |
|------|--------|
| **Zustand stores** | One store per domain: `chatStore.ts`, `modelStore.ts`. Keep in `src/stores/`. |
| **No prop drilling beyond 2 levels** | Use Zustand selectors or context. |
| **Derived state** | Compute in selectors or `useMemo`, never sync with `useEffect`. |
| **Tauri invoke wrappers** | All `invoke()` calls go through `src/services/`. Never call `invoke` directly in components. |

### 5. TypeScript

| Rule | Detail |
|------|--------|
| **Explicit return types** | Required on all exported functions and public methods. |
| **No `any`** | Use `unknown` and narrow. Biome warns on `noExplicitAny`. |
| **Type-only imports** | Always use `import type` for type-only imports (Biome enforces `useImportType`). |
| **Co-located types** | Domain types in `src/types/index.ts`. Component-local types in the component file. |

### 6. React Best Practices

| Rule | Detail |
|------|--------|
| **Hooks at top level** | Never call hooks conditionally or inside loops (Biome `useHookAtTopLevel`). |
| **Exhaustive deps** | All hooks dependencies listed (Biome `useExhaustiveDependencies`). |
| **No nested component defs** | Define components outside other components. |
| **Keys on iterables** | Always provide stable, unique keys. Never use array index. |

### 7. File & Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── ModelBrowser.tsx
│   ├── ModelBrowser.css # Component-specific styles (non-reusable)
│   └── ...
├── services/            # Tauri invoke wrappers (one per domain)
│   ├── database.ts      # DB operations
│   └── geniex.ts        # Model & server operations
├── stores/              # Zustand state stores
│   ├── chatStore.ts
│   └── modelStore.ts
├── types/               # Shared TypeScript types
│   └── index.ts
├── App.tsx              # Root page (max 400 LOC)
├── App.css              # Global/reusable CSS, custom properties, swatches
├── main.tsx             # Entry point
└── theme.ts             # FluentUI theme tokens
```

---

## Backend (Rust / Tauri 2)

### 8. SOLID Principles

| Principle | Application |
|-----------|-------------|
| **S — Single Responsibility** | Each command module (`chat.rs`, `database.rs`, `models.rs`, `server.rs`) handles exactly one domain. If a function does two things, split it. |
| **O — Open/Closed** | New Tauri commands are added by: (1) writing the handler in the appropriate `commands/*.rs` module, (2) adding it to `generate_handler![]` in `lib.rs`. Existing modules are never modified to add unrelated logic. |
| **L — Liskov Substitution** | Entity structs (`ChatSession`, `Message`, etc.) are plain data — no hidden behavior. They serialize/deserialize consistently via `#[derive(Serialize, Deserialize)]`. |
| **I — Interface Segregation** | `AppState` holds only what's shared (server process handle, HTTP client). Module-specific state (DB pool) is managed via Tauri's state injection, not stuffed into `AppState`. |
| **D — Dependency Inversion** | Commands accept Tauri `State<'_, DatabaseConnection>` and `State<'_, AppState>` — never construct their own dependencies. |

### 9. Module & File Organization

```
src-tauri/src/
├── lib.rs               # Tauri builder, setup, invoke_handler registration
├── main.rs              # Entry point (delegates to lib)
├── commands/            # Tauri command handlers (one file per domain)
│   ├── mod.rs           # AppState definition, shared types
│   ├── chat.rs          # chat_completion, load_model, unload_all_models
│   ├── database.rs      # CRUD for sessions, messages, settings, preferences
│   ├── models.rs        # list_models, pull_model, remove_model, search_models
│   ├── server.rs        # start_server, stop_server, get_server_status
│   └── constants.rs     # Shared constants (timeouts, URLs, limits)
├── entities/            # Sea-ORM entity structs (one per table)
│   ├── chat_session.rs
│   ├── message.rs
│   ├── model_setting.rs
│   ├── user_preference.rs
│   └── mod.rs
└── migrations/          # Database migrations
    └── m20260730_000001_create_tables.rs
```

| Rule | Detail |
|------|--------|
| **One domain per file** | `chat.rs` only has chat-related commands. No cross-domain logic. |
| **Max 300 lines per command file** | If approaching the limit, extract helper functions into a private module or a shared `utils` module. |
| **Constants over magic values** | All timeouts, URLs, buffer sizes → `constants.rs`. |
| **Error handling** | Use `Result<T, String>` return types for Tauri commands (Tauri serializes `Err(String)` to the frontend). Never panic in command handlers. |
| **No unwrap() in production code** | Use `.expect()` only in `setup()` for truly unrecoverable failures. In command handlers, use `?` with `.map_err(|e| e.to_string())`. |

### 10. Frontend ↔ Backend Correspondence

| Rule | Detail |
|------|--------|
| **Service ↔ Module mapping** | `src/services/database.ts` ↔ `src-tauri/src/commands/database.rs`. `src/services/geniex.ts` ↔ `src-tauri/src/commands/{models.rs, server.rs, chat.rs}`. |
| **Every frontend `invoke()` must have a Rust handler** | The command name string in `invoke("command_name")` must match a function in `commands/*.rs` registered in `lib.rs`'s `generate_handler![]`. |
| **Type symmetry** | The TypeScript interface in `types/index.ts` must match the Rust struct's serialized shape. When adding a field to a Rust entity, update the TS type in the same PR. |
| **New endpoints → both sides** | Adding a feature means: (1) Rust handler in `commands/`, (2) register in `lib.rs`, (3) TS wrapper in `services/`, (4) types in `types/index.ts`. All four, always. |
| **No orphaned commands** | Every function in `generate_handler![]` must have a corresponding `invoke()` call somewhere in `src/services/`. If the frontend never calls it, remove it. |

### 11. Database & Migrations

| Rule | Detail |
|------|--------|
| **Migration naming** | `m{YYYYMMDD}_{seq}_description.rs` — timestamp-ordered. |
| **Entity-per-table** | One file in `entities/` per database table. Derive `FromJson`, `Related`, etc. |
| **DB pool injection** | Use `State<'_, DatabaseConnection>` in command signatures. Never create new pool connections per request. |

### 12. Error Handling Patterns

```rust
// ✅ Correct — propagate as string for Tauri
#[tauri::command]
pub async fn my_command(state: State<'_, DatabaseConnection>) -> Result<MyData, String> {
    let db = state as &DatabaseConnection;
    // ...
    my_query(db).await.map_err(|e| e.to_string())
}

// ❌ Wrong — panics crash the app
pub async fn my_command(...) -> MyData {
    my_query(db).await.unwrap()
}
```

---

## Biome Configuration

Key rules enforced by `biome.json`:

| Rule | Severity | Purpose |
|------|----------|---------|
| `noExcessiveCognitiveComplexity` | warn | Functions stay ≤ 6 cognitive complexity |
| `noUnusedImports` | error | Dead imports are compilation errors |
| `noUnusedVariables` | warn | Dead variables are warnings |
| `noInlineStyles` | warn | All styles via CSS classes (nursery) |
| `noUnusedClasses` | warn | CSS classes must be referenced (nursery) |
| `useImportType` | error | Always `import type { X }` for types |
| `useConst` | error | Prefer `const` over `let` |
| `noExplicitAny` | warn | Avoid `any` type |
| `domains.react: recommended` | — | Full React best-practices rule set |

Run checks before committing:
```bash
biome check src/          # Lint + format check
biome check --write src/  # Auto-fix safe issues
tsc --noEmit              # Type check
vite build                # Build verification
```

---

## Review Checklist

Before submitting any change, verify:

- [ ] **Frontend**: No inline styles (except dynamic CSS custom properties)
- [ ] **Frontend**: Component < 250 LOC, page < 400 LOC
- [ ] **Frontend**: Reusable components in `src/components/`, imported where needed
- [ ] **Frontend**: Non-reusable CSS co-located in `ComponentName.css`
- [ ] **Frontend**: Reusable CSS (colors, swatches) in `App.css`
- [ ] **Backend**: New command registered in `lib.rs` `generate_handler![]`
- [ ] **Backend**: Corresponding `invoke()` wrapper in `src/services/`
- [ ] **Backend**: TypeScript types updated in `src/types/index.ts`
- [ ] **Backend**: Command handler ≤ 300 LOC, no panics, `Result<T, String>`
- [ ] **Backend**: Constants in `constants.rs`, not magic values
- [ ] **Both**: `biome check src/` passes
- [ ] **Both**: `tsc --noEmit` passes
- [ ] **Both**: `vite build` succeeds
