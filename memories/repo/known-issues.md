# Known Issues — LocalGenie

## Active

### Fluent UI Toast Not Showing (2026-07-30)
- `dispatchToast()` API is correct (NOT the `toast()` helper which doesn't exist in v9.62.0)
- `<Toaster toasterId="app-toaster" />` rendered at app root in `App.tsx`
- `.fui-Toaster { z-index: 100000 !important }` in `App.css` — still no toast
- Root cause unresolved — likely Drawer overlay or Toaster portal context issue

### Model Loading Broken
- Warmup request (`POST /v1/chat/completions` with `max_tokens:1`) sent correctly but GenieX server never responds
- NPU loading takes minutes; server blocks all HTTP during load
- Timeout increased to 600s but model still never loads
- Blocks entire core workflow (load ? chat)

### No Model Unload Without Killing Server
- No per-model unload endpoint in GenieX CLI
- Only way to free model memory is to kill the `geniex serve` process

## Resolved

### Session Persistence Bug (FIXED 2026-07-30)
- `saveSession` used `INSERT OR REPLACE` which cascaded and wiped all messages
- Fix: changed to `INSERT ... ON CONFLICT(id) DO UPDATE SET ...` (upsert without CASCADE trigger)

## Notes

### Brand Rename (2026-08-08)
- Renamed from "GenieX-UI" to "LocalGenie" across codebase and GitHub repo
- GenieX CLI references (`geniex` binary, `geniex.ts` service, `geniex.db`, `com.geniex.ui`) preserved