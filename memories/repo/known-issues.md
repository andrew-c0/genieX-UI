# Known Issues — GenieX-UI

## Fluent UI Toast Not Showing (2026-07-30)

- `useToastController("app-toaster")` + `<Toast><ToastTitle>` JSX pattern used in `AppSettings.tsx` and `ModelSettings.tsx`
- `<Toaster toasterId="app-toaster" />` rendered at app root in `App.tsx`
- `.fui-Toaster { z-index: 100000 !important }` added to `App.css` — still no toast
- The `toast()` helper from `@fluentui/react-components` does NOT exist in v9.62.0
- `@fluentui/react-toast` also doesn't export `toast()` in this version
- Correct API: `dispatchToast(<Toast><ToastTitle>...</ToastTitle></Toast>, { intent: "success" })`
- Root cause of non-display is still unresolved — possibly Drawer overlay or Toaster portal context issue

## Settings Drawer File Overwrite

- PowerShell `Set-Content` with here-string (`@'...'@`) was needed to overwrite `SettingsDrawer.tsx`
- `replace_string_in_file` tool failed repeatedly due to whitespace/CRLF mismatches in the 341-line file
- `create_file` tool refuses to overwrite existing files
