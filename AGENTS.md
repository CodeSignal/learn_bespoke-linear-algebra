# CodeSignal Linear Algebra Playground – AGENTS

Repository-wide rules for the Bespoke-powered linear algebra playground. Read
this file first, then the nested `AGENTS.md` files (`client/`, `client/core/`,
`client/modes/`) before touching code in those areas.

## Required References
1. `BESPOKE.md` – canonical Bespoke framework contract (HTML slots, CSS
   variables, component semantics). Never override `bespoke.css`; scope changes
   in app-specific styles.
2. `client/help-content-template.html` – authoritative help markup that new
   sections must clone.
3. `CLAUDE.md` – product primer; keep it aligned with these AGENTS notes.

## Project Overview
- Education-focused web app served by `server.js`; static assets live under
  `client/`. No build step.
- Three interaction modes share services in `client/core` and controllers in
  `client/modes`: vector canvas, matrix transformer, and 3D tensor explorer.
- Mode availability is config-driven (`config.json.enabledModes`); mode buttons
  render dynamically via `ModeManager` and content for disabled modes is
  hidden.
- Status messaging, help modal, theming, coordinate system, and logging are all
  centralized services; do not reimplement per feature.

## Repository Map
- `server.js` – static file server + `/message` WebSocket broadcast (requires
  `ws`) + `/log` endpoint that appends to `logs/user_actions.log`.
- `client/` – HTML, CSS, runtime JS, logger, WebSocket + help bootstrap. See
  `client/AGENTS.md`.
- `client/core/` – shared services (ConfigService, ModeManager, CanvasTheme,
  StatusService, HelpService, CoordinateSystem, Vector class, utilities).
- `client/modes/` – controllers for vector/matrix/tensor modes plus sidebar,
  canvas, operations, and 3D renderer (`tensor-canvas-3d.js`). Destroy
  listeners in `destroy()`. Details in `client/modes/AGENTS.md`.
- `client/entities/matrix.js` – immutable 2×2 `Matrix` model.
- `BESPOKE.md`, `CLAUDE.md`, `README.md`, `refactoring.md` – guidance only;
  do not contradict AGENTS contracts.
- No AGENTS files are required under `logs/` or other data-only folders.

## Run + Test
1. Optional deps (needed for WebSocket hub + curl broadcast demo):
   `npm install`.
2. Start server: `npm start` (or `npm run dev`, both call `node server.js`).
3. App lives at `http://localhost:3000`. Manual exercise only; no automated
   tests exist.
4. WebSocket broadcast check (requires `ws`):\
   `curl -X POST http://localhost:3000/message -H 'Content-Type: application/json' -d '{"message":"Hello"}'`
5. Logging check: POST to `/log` or call `logAction()`; entries append to
   `logs/user_actions.log`.

## Mandatory Guardrails
- **Status strings**: Only use `"Ready"`, `"Loading..."`, `"Saving..."`,
  `"Changes saved"`, `"Save failed (will retry)"`, `"Failed to load data"`,
  `"Auto-save initialized"`. Route all updates through `window.StatusService`.
- **Async safety**: Wrap every fetch/WebSocket/localStorage call in try/catch,
  `console.error` failures, and fall back to `StatusService.setReady()` after
  recovery. Implement retry loops for save workflows and surface
  `QuotaExceededError` when touching localStorage.
- **Config**: Fetch `client/config.json` via `ConfigService`. Treat the returned
  object as immutable (it is `Object.freeze`d in `linear-algebra.js`). Validate
  operation groups with `OperationSchemas.validateOperationGroups` before
  binding UI or enabling controls.
- **Mode lifecycle**: Register modes with `ModeManager.registerMode(name,
  factory)` and switch via `ModeManager.setMode()`. Factories must return an
  object exposing `destroy()` to remove DOM/canvas listeners and unsubscribe
  from `CanvasThemeService`.
- **Logging**: Use the global `logAction(message)` helper. It POSTs to `/log`
  and intentionally swallows errors; do not block UX on logging failures.
- **Help modal**: Bootstrap through `HelpService.initializeHelpModal({
  triggerSelector: '#btn-help', theme: 'auto' })`. Mode-specific sections must
  call `HelpService.appendHelpContent` and follow the template structure.
- **Theme + canvas**: `CanvasThemeService.init(STYLE_CONSTANTS)` already runs in
  `linear-algebra.js`. Subscribe via `CanvasThemeService.subscribe` to refresh
  renderers when system theme flips; propagate colors to `CoordinateSystem` and
  per-mode canvases.
- **HTML contract**: Keep `<body class="bespoke">`. Preserve script order as
  in `client/index.html`: `help-modal.js` → `logger.js` → core services
  (`status.js`, `config.js`, `operation-schemas.js`, `help.js`,
  `mode-manager.js`, `color-utils.js`, `theme-service.js`, `results-panel.js`,
  `format-utils.js`, `vector.js`, `animator.js`, `coordinate-system.js`) →
  `app.js` → entities (`entities/matrix.js`) → mode scripts
  (`vector-*`, `matrix-*`, `tensor-*`) → `linear-algebra.js` entrypoint. New
  shared utilities belong with the core block; new modes load with other mode
  scripts.
- **Bespoke snapshot**: Follow the Bespoke-specific rules listed in
  the user instructions and `BESPOKE.md`.

## Documentation Layers
- `client/AGENTS.md` – HTML shell, asset order, runtime bootstrap, logging, and
  WebSocket details.
- `client/core/AGENTS.md` – shared service APIs and invariants.
- `client/modes/AGENTS.md` – vector/matrix orchestration, UI bindings, canvas
  rendering, teardown patterns.
Always read the root-to-leaf chain relevant to your change before editing.

## Security + Logging
- Server hardens path traversal; keep files under `client/`. Do not add dynamic
  endpoints without updating this doc.
- `/log` accepts arbitrary JSON; never trust user input elsewhere. Only log
  sanitized strings.
