# Code Quality & Developer Experience

## Completed

### Code Quality (2026-08-07)
- **Magic numbers extracted**: `18181` port ? `constants.rs` (DEFAULT_PORT, DEFAULT_BASE_URL, HTTP_TIMEOUT_SECS, SERVER_STARTUP_PROBES, SERVER_STARTUP_PROBE_DELAY_MS)
- **Magic number `50`**: title truncation ? `AUTO_TITLE_MAX_LENGTH` in chatStore.ts
- **Dead export removed**: `customThemeVars` from theme.ts (was never imported)
- **Unsafe type cast fixed**: `as Message["role"]` in database.ts ? `toValidRole()` with runtime validation
- **Dead CSS removed**: `.flex-center`, `.gap-8`, `.text-muted`, `.text-sm` (0 references)

### Developer Experience (2026-08-07)
- **Biome.js** installed and configured (replaces ESLint + Prettier)
  - Config: `biome.json` — formatter + linter with recommended rules
  - Key rules: noUnusedImports, noUnusedVariables, useConst, useImportType, useButtonType, useExhaustiveDependencies
- **tsconfig.json strictness**: `noUnusedLocals: true`, `noUnusedParameters: true`
- **React Error Boundary**: `src/components/ErrorBoundary.tsx` wrapping App in `main.tsx`

### Brand Rename (2026-08-08)
- Renamed from "GenieX-UI" to "LocalGenie" across codebase, docs, and GitHub repo
- Crate renamed: `geniex_ui_lib` ? `local_genie_lib`
- Package renamed: `geniex-ui` ? `local-genie`
- Theme renamed: `genieXTheme` ? `localGenieTheme`
- All GenieX CLI references preserved (`geniex` binary, `geniex.ts` service, `geniex.db`, `com.geniex.ui`)

## npm Scripts
- `npm run lint` — Biome lint check
- `npm run lint:fix` — Biome auto-fix
- `npm run format` — Biome format all files
- `npm run check` — TypeScript type check

## Known Remaining Items (lower priority)
- **Duplicated model name stripping**: `includes(":")` / `split(":")[0]` in ChatInput.tsx, ModelSelector.tsx, and Rust `strip_precision`
- **Inline styles**: 69 `style={}` across 9 components — user wants CSS-only rule enforced via Biome
- **SSE parser extraction**: chat_completion is ~130 lines; SSE parsing could be a separate fn
- **Error handling inconsistency**: mix of silent `.catch(() => {})` and logged catches