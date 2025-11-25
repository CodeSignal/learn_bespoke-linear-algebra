# client/core – AGENTS

Shared services, utilities, and math primitives that power both vector and
matrix modes. These modules must stay framework-free, DOM-light, and reusable
across future Bespoke apps.

## Loading Order + Globals
- Files are loaded (via `<script>` tags) in deterministic order before
  `linear-algebra.js`. Do not introduce circular dependencies.
- Each module attaches itself to `window.*` or defines a global class. Keep
  those names stable; the rest of the app references them directly.

## Modules
- `status.js` (`window.StatusService`)\
  - Sole gateway for status text. Only expose the allowed verbatim strings.
  - Gracefully handle missing `#status` (warn once, no throws).
- `config.js` (`window.ConfigService`)\
  - Fetches `./config.json`, merges with `DEFAULT_CONFIG`, caches the result,
    and emits `StatusService.setLoading()` / `setReady()` / `setLoadFailed()`.
  - Returns *mutable* objects internally but callers must treat them as frozen
    because `linear-algebra.js` wraps them in `Object.freeze`.
  - Expose `clearCache()` for manual reloads/tests.
- `operation-schemas.js` (`window.OperationSchemas`)\
  - Source of truth for allowed operation group keys. Always run
    `validateOperationGroups(mode, groups)` before wiring UI so that new config
    flags cannot break the app.
- `mode-manager.js` (`window.ModeManager`)\
  - Owns `.mode-content` visibility and the shared `CoordinateSystem`.
  - `renderModeButtons(enabledModes)` + `hideDisabledModeContainers(enabledModes)`
    drive what the user sees based on `config.json.enabledModes`.
  - `onModeChange(callback)` notifies helpers like the HelpService when the
    active mode flips.
  - `registerMode(name, factory)` stores factories that must return instances
    exposing `destroy()`.
  - `setMode(name)` tears down the current instance (wrapped in try/catch) and
    applies `.active`/`.hidden` classes. Never mutate the DOM for mode toggles
    elsewhere.
- `help.js` (`window.HelpService`)\
  - Lazily fetches `help-content-template.html` once, initializes `HelpModal`,
    and supports `appendHelpContent()`. Always call `initializeHelpModal`
    before appending extra sections.
- `theme-service.js` (`window.CanvasThemeService`)\
  - Initialized exactly once with `STYLE_CONSTANTS`. Provides `getColors()`,
    `subscribe(callback)` (returns unsubscribe fn), and cleans up media-query
    listeners via `destroy()`. Subscribers must unsubscribe inside their
    `destroy()` implementation.
- `color-utils.js` (`window.ColorUtils`)\
  - Reads CSS custom properties under `.bespoke`. Use this to keep colors
    responsive to theme changes instead of hard-coding hex values.
- `animator.js` (`class Animator`)\
  - Pure animation helpers (ease curves, `animate`, `lerp`, `lerpVector`).
    Returns a control object with `cancel()`. Modes must cancel outstanding
    animations inside `destroy()`.
- `coordinate-system.js` (`class CoordinateSystem`)\
  - Handles canvas sizing, grid/axis drawing, coordinate transforms, hover
    hit-testing helpers, and translated vector rendering. Register resize
    callbacks via `setResizeCallback`.
- `vector.js` (`class Vector`)\
  - Immutable 2D vector with math helpers (`add`, `subtract`, `scale`, `dot`,
    projections, reflections, normalization, perpendicular, angle utilities).
    `Vector.defaultResultColor` should be overridden through `Vector.setDefaultResultColor`
    so that result vectors track the theme.
- `results-panel.js` (`class ResultsPanel`)\
  - Lightweight wrapper that writes formula/result markup into a container.
    Use `.show(...lines)` and `.clear()` rather than manipulating DOM manually.
- `format-utils.js` (`window.FormatUtils`)\
  - HTML formatting helpers for matrices (`formatMatrixAsGrid`) and vectors
    (`formatVector`). Use them whenever results need inline math formatting.

## Cross-Cutting Rules
- Keep modules idempotent: calling init/load functions multiple times should be
  safe (e.g., `CanvasThemeService.init` ignores missing constants, `HelpService`
  warns on double init).
- Every async function (`ConfigService.loadConfig`, `HelpService` fetches)
  must `console.error` on failure and fall back to usable defaults (e.g.,
  placeholder help copy).
- Never mutate DOM outside the module’s intended surface (e.g., `ResultsPanel`
  can write into its container, but `Vector` must remain math-only).
- All exports should be documented here whenever new files are added. If you
  add another shared service, update this AGENTS file before landing the code.
