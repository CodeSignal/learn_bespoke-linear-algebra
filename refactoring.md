# Refactoring Plan: Preparing Vector Mode Codebase for Matrix Mode Expansion

## Objectives
- Make mode-specific code modular so we can add matrix-focused interactions without duplicating the vector stack.
- Eliminate dead/duplicate logic so shared services stay predictable.
- Normalize styling, configuration, and documentation so both modes render consistently inside the Bespoke framework.

## Prioritized Work Items

### 1. Mode lifecycle + initialization (P0)
**Observations**
- `ModeManager` only toggles CSS classes (`client/core/mode-manager.js:5-68`) and exposes an unused `getResultsContainer()` (`client/core/mode-manager.js:52-67`).
- The actual creation of VectorMode/MatrixMode lives in `client/linear-algebra.js:120-205`, with duplicated show/hide fallbacks and one-off reset wiring for matrix mode (`client/linear-algebra.js:176-198`).
- There is no user-facing control to switch modes; the app must be reconfigured via `config.json`, yet both DOM trees stay mounted (`client/index.html:24-210`).

**Actions**
- Turn `ModeManager` into a true controller: register available modes with their mount/destroy hooks, own the shared `CoordinateSystem`, and expose `setMode('vector'|'matrix')` that handles teardown + instantiation.
- Add a small mode-switch UI (tabs or segmented control) where `<!-- APP_SPECIFIC_HEADER_CONTENT -->` currently sits (`client/index.html:15-20`), wired to `ModeManager` so matrix mode can actually be reached without editing config.
- Update `linear-algebra.js` so it becomes a thin bootstrapper: load config once, hydrate the mode registry, and delegate lifecycle entirely to `ModeManager`. Remove the inline matrix reset logic so every mode encapsulates its own buttons.
- Ensure `ModeManager` triggers shared services (status, help addenda, results panel) during mode swaps so we do not leak listeners when matrix mode grows feature parity.

### 2. Vector mode modularization + performance (P0)
**Observations**
- `VectorMode` is a 1200-line class (`client/modes/vector-mode.js:6-1188`) mixing state, DOM wiring, math, and animations. There are unused state fields (`isDragging`, `dragTarget`, `mousePos`; `client/modes/vector-mode.js:21-28`), and `destroy()` does not unbind any listeners (`client/modes/vector-mode.js:1184-1194`).
- UI updates hit the DOM on every animation frame because `render()` unconditionally calls `this.updateUI()` (`client/modes/vector-mode.js:226-335` and `client/modes/vector-mode.js:1061-1160`). Each call re-queries dozens of `document.getElementById` references, causing synchronous layout during canvas animations.
- `clearAll()` never clears the results pane (`client/modes/vector-mode.js:578-586`), so users see stale formulas after resetting.

**Actions**
- Split VectorMode into focused modules: `VectorCanvas` (render + hit testing), `VectorOperations` (math + logging), and `VectorSidebar` (DOM refs + enabling/disabling). Pass the sidebar root into the constructor (mirroring MatrixMode) so selectors are scoped and cacheable.
- Introduce an event dispatcher so render ticks only paint to canvas while sidebar updates are triggered by explicit state changes (vector created/removed, config toggled). Cache DOM nodes once and drive them via a small view-model.
- Track event handler references so `destroy()` detaches listeners when the mode is hidden, preventing double-binding when we add runtime mode switching.
- Fix `clearAll()` to call the shared `ResultsPanel.clear()` once it exists, and ensure every operation that mutates vectors emits an update so status + results stay truthful.

### 3. Shared services + duplicate logic (P0)
**Observations**
- Both modes copy the same color-loading + theme-listening code blocks (`client/modes/vector-mode.js:48-75` vs `client/modes/matrix-mode.js:54-87`).
- Result rendering is duplicated (`client/modes/vector-mode.js:1169-1176`) and even unused in matrix mode (`client/modes/matrix-mode.js:205-210`).
- `Animator` (`client/core/animator.js:1-120`) and `ModeManager.getResultsContainer` are unused; `MatrixMode` helper functions (`formatMatrixAsGrid`, `formatVector`) sit idle at `client/modes/matrix-mode.js:167-210`.
- Status messaging is only used during config/websocket init; vector/matrix operations never surface “Loading…/Ready/Failed” states even though AGENTS.md mandates them.

**Actions**
- Create a `CanvasThemeService` in `client/core` that exposes `getColors()` + subscribes to `matchMedia`, and let both modes depend on it instead of duplicating code.
- Extract a reusable `ResultsPanel` (simple class that accepts a root element, handles `.formula` markup, and exposes `show(lines)/clear()`). Wire both modes through it so matrix operations finally display output and vector mode stops directly touching the DOM.
- Either delete `Animator` or refactor `VectorMode` animations to use it; keeping dead utilities invites drift.
- Remove unused helpers or plan to use them immediately (e.g., leverage `formatMatrixAsGrid` when rendering determinant steps).
- Route long-running actions (config fetch, auto-save, any future networked ops) through `StatusService` with canonical messages from AGENTS.md so modes don’t invent their own strings.

### 4. Matrix mode parity groundwork (P1)
**Observations**
- Matrix results UI never changes because `displayResult()` is unused and no operation writes into `#matrix-results` (`client/modes/matrix-mode.js:205-210`).
- The reset button is wired outside the class (`client/linear-algebra.js:176-198`) even though `MatrixMode` already caches the element (`client/modes/matrix-mode.js:13-23`).
- `drawTransformedSquare()` re-fetches CSS variables every render via `ColorUtils.getColorFromCSS` (`client/modes/matrix-mode.js:268-305`) instead of reusing cached theme colors.
- There’s no logging/status feedback for determinant preview, and no scaffolding for additional operations we’ll need in matrix mode.

**Actions**
- Move reset + determinant button handlers fully inside `MatrixMode` so the class owns its sidebar and can be mounted/unmounted cleanly.
- Use the forthcoming `ResultsPanel` to show numeric determinant, orientation (sign), and e.g. transformed basis vectors each time inputs change.
- Cache accent/danger colors in `loadColorsFromCSS()` so `drawTransformedSquare` stops recomputing them per frame and we stay consistent with theme overrides.
- Stub extensible operation hooks (e.g., `applyPreset(Matrix.rotation(...))`, `showEigenvectors`) so we have clear seams for the “matrix mode” roadmap once vector code is tidy.

### 5. Configuration single source of truth (P1)
**Observations**
- Defaults exist in three places: `CONFIG` (`client/linear-algebra.js:8-60`), `DEFAULT_CONFIG` (`client/core/config.js:14-44`), and `client/config.json`. Divergence is already visible (matrix operation groups only live in JSON/default config but are partially injected into `CONFIG.matrixOperationGroups` at runtime `client/linear-algebra.js:91-115`).
- Modes read from the mutable global `CONFIG`, making it hard to reason about what config a mode actually received when we add runtime switching.

**Actions**
- Make `ConfigService` the authoritative source: add `ConfigService.getSync()` that returns the merged object, and replace the global `CONFIG` mutations with an immutable `appConfig` object passed into each mode at construction.
- Define shared schemas/enums for operation group keys so vector + matrix modes cannot drift.
- Allow per-mode overrides (max vectors, enabled operations) to be re-read when user toggles modes, so matrix mode can eventually opt into features without page reload.

### 6. CSS + layout rationalization (P1)
**Observations**
- `linear-algebra.css` mixes global layout with highly specific vector widgets; matrix styles sit in the same file, making it hard to share tokens between modes (`client/linear-algebra.css:1-640`).
- Select/input styling is copied several times for `.coord-select`, `.scale-select`, `.reflect-select`, `.vector-select`, `.matrix-input` etc. with hard-coded colors (#ef4444, #3b82f6) instead of the Bespoke variables (`client/linear-algebra.css:78-240`, `client/linear-algebra.css:600-660`).
- There’s a typo `var(--bespoke-space-sx)` (`client/linear-algebra.css:471`), so the operations header loses its intended spacing.

**Actions**
- Split the stylesheet into `layout.css` (shared shell), `vector-mode.css`, and `matrix-mode.css`, each using the same utility classes. Import them from `index.html` after the core `bespoke.css`.
- Replace hard-coded colors with CSS vars (e.g., use `--vector-1-color` set on `.mode-content[data-mode="vector"]`) so matrix mode can override hues centrally. Tie matrix column colors to `CONFIG.colors.matrixBasis*` for consistency.
- Deduplicate the repeated select/input declarations by creating a `.bespoke .form-select` class and reusing it.
- Fix the `--bespoke-space-sx` typo and audit other tokens so everything maps back to AGENTS.md.

### 7. HTML template + help content compliance (P2)
**Observations**
- Placeholder `<!-- APP_SPECIFIC_HEADER_CONTENT -->` remains in the live DOM (`client/index.html:17`), violating the Bespoke template instructions.
- Since both vector and matrix sidebars are rendered simultaneously, we pay for extra DOM and lose an obvious place to host mode-switch controls.
- `help-content-template.html` documents only vector workflows; matrix learners will have no reference once we ship that mode.

**Actions**
- Replace the header placeholder with a compact mode-switch component (e.g., pill buttons) plus any future controls (save/reset). Wire it into `ModeManager` per item #1.
- Consider gating the inactive mode markup behind templates (e.g., `<template id="vector-mode-template">`) or rendering via JS so we only instantiate the active mode’s DOM tree.
- Expand the help content with a “Matrix Mode” section covering matrix input, determinant visualization, and any presets once they exist. Load the content dynamically per mode via `HelpService.appendHelpContent()` to keep things DRY.

### 8. Documentation + dev ergonomics (P2)
**Observations**
- README still references a `LinearAlgebraApp` class that no longer exists (`README.md:68-93`) and advertises port 3000 while the server listens on 3001 (`server.js:20`).
- There are no contributor notes explaining the Bespoke-specific constraints (status messages, file ordering, etc.).

**Actions**
- Rewrite the README’s architecture section to describe the new mode system, shared services, and how to extend vector/matrix operations.
- Document the server port and workflow, and add a short “Bespoke compliance” checklist referencing AGENTS.md so future contributors don’t reintroduce placeholder/template issues.

---
Executing the P0 items (mode lifecycle, vector modularization, shared services) is a prerequisite for any serious matrix-mode work. Once those are in place, the P1/P2 tasks become incremental follow-ups rather than risky rewrites.
