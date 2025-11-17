# client – AGENTS

Front-end shell for the CodeSignal Linear Algebra Playground. Read this file
before editing any asset under `client/`, then consult the sub-AGENTS inside
`client/core/` and `client/modes/`.

## Layout + Asset Ordering
1. `index.html` is the only HTML entry point. Keep `<body class="bespoke">`.
2. CSS order (top→bottom) is fixed: `bespoke.css`, `layout.css`,
   `vector-mode.css`, `matrix-mode.css`, plus any extra sheets appended after
   the Bespoke base.
3. Script order in `<head>`/`<body>`: `help-modal.js`, shared core services,
   `linear-algebra.js`, then mode scripts (`client/modes/*`). New shared
   utilities belong before `linear-algebra.js`; new modes belong after it.
4. Template placeholders (`<!-- APP_TITLE -->`, etc.) in legacy templates must
   be replaced exactly once; do not reintroduce them.

## Key Files
- `index.html` – hosts sidebar + canvas layout, status area, and both `.mode-content`
  containers. Toggle visibility exclusively through `ModeManager.updateUIVisibility`.
- `bespoke.css` – **do not edit** (use app-specific sheets instead). Bespoke
  tokens and component rules live in `BESPOKE.md`.
- `layout.css` / `vector-mode.css` / `matrix-mode.css` – safe locations for
  app-level overrides. Use Bespoke spacing (`--bespoke-space-*`), radii, and
  color tokens when possible; test both light/dark schemes after overrides.
- `linear-algebra.js` – runtime entry point: loads config, initializes
  `CanvasThemeService`, registers vector/matrix modes, and flips active mode via
  `ModeManager.setMode`. Treat `STYLE_CONSTANTS` as immutable design tokens.
- `app.js` – bootstraps `HelpService.initializeHelpModal` and manages the
  resilient WebSocket client. On every connection event (open/close/error),
  fall back to `StatusService.setReady()`. New message handlers must guard JSON
  parsing with try/catch and default to ignoring unknown payloads.
- `help-modal.js` + `help-content-template.html` – shared help modal
  infrastructure. Duplicate structure by cloning the template; never invent
  ad-hoc markup.
- `config.json` – student-editable toggles for default mode and operation
  groups. Runtime consumers must go through `ConfigService`.
- `logger.js` – exposes global `logAction(message)` that POSTs to `/log` and
  silently ignores failures. Always use this helper instead of hand-rolled
  fetches.
- `entities/matrix.js` – immutable 2×2 matrix model used by matrix mode
  (no AGENTS required because it is <1000 LOC).

## Runtime Contracts
- Call `CanvasThemeService.init(STYLE_CONSTANTS)` once (already done in
  `linear-algebra.js`). Per-mode code should subscribe via
  `CanvasThemeService.subscribe` and push updated palettes into their renderers
  and `CoordinateSystem`.
- `ModeManager.registerMode(name, factory)` defers heavy instantiation until
  the mode activates. Factories must return an object that implements
  `destroy()`; clean up DOM listeners, `requestAnimationFrame` loops, and theme
  subscriptions there.
- Always route status changes through `window.StatusService`. Only the verbatim
  strings listed in the root AGENTS are allowed.
- Config data flows: `ConfigService.loadConfig()` fetches `config.json`, merges
  defaults, and caches. `linear-algebra.js` freezes the resulting object; never
  mutate it downstream. Validate `operationGroups` with
  `OperationSchemas.validateOperationGroups(mode, groups)` before enabling
  UI elements.
- Log every user-triggered operation (`VectorOperations`, `MatrixMode`
  transforms, config changes) via `logAction`.
- LocalStorage, fetch, and WebSocket code must be wrapped in try/catch with
  clear console errors plus user-friendly statuses. Explicitly detect and surface
  `QuotaExceededError` when writing to storage.

## HTML + UI Expectations
- Header exposes status area (`#status`) and `#btn-help`. Help modal theme must
  stay `'auto'`.
- `.mode-content[data-mode]` containers remain mounted; toggling is done by
  adding `.active` / `.hidden` classes (see `ModeManager`).
- Results panels use `ResultsPanel` (from `client/core`) for consistent markup.
  Instantiate once per sidebar, reuse for all operations.
- Buttons and inputs rely on Bespoke components (`.as-button`, `.sidebar`,
  `.card`, `.row`, `.toggle`, etc.). Follow spacing tokens; no magic numbers
  outside `linear-algebra.css` derivatives.

## Logging + Diagnostics
- Server logging is append-only; `logs/user_actions.log` lives outside this
  directory. When testing logging, run the curl commands from the root README
  or root AGENTS instructions.
- Use DevTools overlays built into the app (axis grid, status area) for manual
  verification; no automated tests are expected.

## Documentation Chain
- Changes touching shared services must also update `client/core/AGENTS.md`.
- Changes touching vector or matrix controllers must update
  `client/modes/AGENTS.md`.
- All contributors must read `BESPOKE.md` to stay compliant with Bespoke
  theming and markup constraints.
