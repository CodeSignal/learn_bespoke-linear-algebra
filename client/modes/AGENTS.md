# client/modes – AGENTS

Mode-specific controllers and UI bindings live here. Each mode must clean up
after itself, respect shared services (`ModeManager`, `CanvasThemeService`,
`StatusService`), and log all user-triggered operations.

## Shared Expectations
- Modes are instantiated lazily via `ModeManager.registerMode(name, factory)`
  inside `linear-algebra.js`. The factory must return an object with `destroy()`
  that removes DOM listeners, cancels animations, and unsubscribes from
  `CanvasThemeService`.
- Always pass the shared `CoordinateSystem` into mode constructors so grid size,
  snapping, and theme colors stay in sync across modes.
- Use `ResultsPanel` (one per mode container) for all textual output.
- Log every button-triggered action through `logAction(message)`; never block UI
  if logging fails.
- Honor config gating: check `appConfig.<mode>.operationGroups` before showing
  or enabling any control groups. Use `data-operation-group` attributes that
  already exist in the DOM to hide/show sections.

## Vector Mode Stack
Files: `vector-mode.js`, `vector-canvas.js`, `vector-sidebar.js`,
`vector-operations.js`.

1. **VectorMode**
   - Orchestrates the canvas, sidebar bindings, animation state, and theme
     subscriptions.
   - Maintains canonical copies of `vector1`, `vector2`, `resultVector`, plus
     interaction state (drawing/editing flags, hover targets).
   - Uses `Animator` to run smooth transitions (addition, subtraction, scalar
     multiplication, parallelogram fills). Store the `animationControl` and
     cancel it in `destroy()`.
   - Calls `sidebar.update*` helpers whenever vectors change; keeps coordinate
     display mode (`cartesian` vs `polar`) in sync with the dropdown.
   - When responding to canvas events:
     - Convert coordinates via `VectorCanvas.screenToMath`.
     - Snap endpoints with `VectorCanvas.snapToGrid` (0.5 increments).
     - Update `StatusService` only for long-running ops; default back to
       `"Ready"` after animations complete.
   - Theme handling: `CanvasThemeService.subscribe` triggers `loadColors()` →
     update `CoordinateSystem`/`VectorCanvas`/result vector colors, then rerender.
2. **VectorCanvas**
   - Pure renderer; no DOM queries outside the canvas context.
   - Renders grid/axes through the shared `CoordinateSystem`, draws vectors,
     parallelogram edges, angle arcs, negated vectors for subtraction, and
     linear combination scaffolding.
   - Exposes hit-testing helpers (`checkEndpointHit`) and transformation
     proxies (`screenToMath`, `mathToScreen`).
3. **VectorSidebar**
   - Caches all DOM references once in the constructor; no repeated queries.
   - `setupEventListeners` wires handlers provided by `VectorMode`. When new
     controls are added, extend the handler map to keep setup consistent.
   - Owns the `ResultsPanel` instance located at `#vector-results`.
   - `updateUI()` (inside `VectorMode`) should drive button enabling/disabling
     through methods on this class; keep logic centralized here.
4. **VectorOperations**
   - Stateless math helper. Returns objects containing:
     - `resultVector` (if applicable).
     - `resultLines` array (strings/HTML for `ResultsPanel`).
     - Optional visualization hints (`parallelogramVectors`, `angleArcState`,
       `clearParallelogram`, `clearAngleArc`, `scaledV1/V2`).
   - Sets `Vector.defaultResultColor` from `styleConstants` so result vectors
     stay on-brand.
   - Logging lives here; emit enough context (operation type, operands, result).

## Matrix Mode
File: `matrix-mode.js` (uses `client/entities/matrix.js` and `client/core/vector.js`).

- Maintains the current 2×2 matrix defined by the input grid (`#m00`–`#m11`),
  plus basis vectors î and ĵ.
- Subscribes to `CanvasThemeService` for color updates, propagates theme colors
  into `CoordinateSystem`, and caches accent/danger hues for determinant
  shading.
- UI bindings:
  - Input events update `this.inputMatrix`, log via `logAction`, call
    `updatePreview()`, and rerender the transformed basis vectors.
  - `#show-determinant` toggles the determinant area overlay; wrap async work in
    `StatusService.setLoading()` / `setReady()`.
  - `#matrix-reset` restores the identity matrix and clears results.
- Rendering responsibilities:
  - Draw transformed basis vectors, parallelogram area, and orientation cues on
    the shared canvas.
  - When determinant visualization is enabled, output explanation lines to the
    `ResultsPanel` (det value + orientation).
- Respect operation group gating: hide determinant controls when
  `appConfig.matrixMode.operationGroups.determinant` is false.
- Destroy path must remove event listeners from all inputs/buttons and
  unsubscribe from `CanvasThemeService`.

## Extending Modes
- Follow the existing decomposition (controller + renderer + sidebar + math) to
  keep logic testable.
- New modes must define `.mode-content[data-mode="new-mode"]` in `index.html`
  and register via `ModeManager.registerMode('new-mode', factory)`.
- Update `linear-algebra.js` to set the default mode via config and to register
  the new factory. Document the additions in this AGENTS file immediately.
