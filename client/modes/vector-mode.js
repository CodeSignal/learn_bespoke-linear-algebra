/**
 * VectorMode Class
 * Orchestrates vector visualization, operations, and interactions
 * Uses modular components: VectorSidebar, VectorCanvas, VectorOperations
 */

class VectorMode {
  constructor(canvas, appConfig, styleConstants, coordSystem, rootElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.appConfig = appConfig; // Runtime configuration from config.json
    this.styleConstants = styleConstants; // Styling constants
    this.coordSystem = coordSystem; // Accept shared CoordinateSystem
    this.root = rootElement; // Root element for sidebar (like MatrixMode)

    // Initialize modules
    this.sidebar = new VectorSidebar(this.root, this); // Pass parent mode for ResultsPanel integration
    this.canvasRenderer = new VectorCanvas(canvas, coordSystem, styleConstants, {});
    this.operations = new VectorOperations(appConfig, styleConstants);

    // Vectors
    this.vector1 = null;
    this.vector2 = null;
    this.resultVector = null;

    // Coordinate display mode
    this.coordinateMode = 'cartesian'; // 'cartesian' or 'polar'

    // Interaction state
    this.isDrawing = false;
    this.isEditing = false;
    this.editTarget = null; // 'vector1' or 'vector2'
    this.drawingVector = null;
    this.startPos = { x: 0, y: 0 };

    // Hover state
    this.hoveredVector = null; // 'vector1' or 'vector2' or null

    // Animation state
    this.isAnimating = false;
    this.animationFrom = null;
    this.animationTo = null;
    this.animationControl = null; // Animator control object for cancellation

    // Parallelogram animation state
    this.parallelogramState = null; // { startTime, v1Progress, v2Progress, edgeOpacity }

    // Angle arc visualization state
    this.angleArcState = null; // { vector1, vector2, angleRadians, angleDegrees }

    // Color cache for theme-responsive rendering
    this.colors = {};

    // Event listener references for cleanup (canvas events)
    this.canvasEventListeners = [];
    this.themeUnsubscribe = null;

    // Load colors from CanvasThemeService
    this.loadColors();

    // Update CoordinateSystem colors if provided
    if (this.coordSystem) {
      const coordColors = {
        grid: this.colors.grid,
        axis: this.colors.axis,
        text: this.colors.text,
        hover: this.colors.hover,
        hoverHighlight: this.colors.hoverHighlight
      };
      this.coordSystem.updateColors(coordColors);

      // Set up resize callback to trigger render
      this.coordSystem.setResizeCallback(() => {
        this.render();
      });
    }

    // Update canvas renderer colors
    this.canvasRenderer.updateColors(this.colors);

    // Subscribe to theme changes
    if (window.CanvasThemeService) {
      this.themeUnsubscribe = window.CanvasThemeService.subscribe(() => {
        this.loadColors();
        this.render();
      });
    }

    // Initialize
    this.setupCanvasEventListeners();
    this.setupSidebarEventListeners();
    this.updateUI(); // Initial UI update
    this.render();
  }

  /**
   * Update dimensions from CoordinateSystem (called after CoordinateSystem setup)
   */
  updateDimensions() {
    this.canvasRenderer.updateDimensions();
  }

  setupCanvasEventListeners() {
    // Store event listener references for cleanup
    const handlers = {
      // Canvas mouse events
      mousedown: (e) => this.handleMouseDown(e),
      mousemove: (e) => this.handleMouseMove(e),
      mouseup: (e) => this.handleMouseUp(e),
      mouseleave: (e) => this.handleMouseLeave(e)
    };

    // Add canvas listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      this.canvas.addEventListener(event, handler);
      this.canvasEventListeners.push({ element: this.canvas, event, handler });
    });
  }

  setupSidebarEventListeners() {
    // Set up sidebar event listeners with handlers
    this.sidebar.setupEventListeners({
      onClearAll: () => this.clearAll(),
      onCoordModeChange: (e) => {
        this.coordinateMode = e.target.value;
        this.updateUI();
      },
      onAdd: () => this.performAdd(),
      onSubtract: () => this.performSubtract(),
      onScale: (vectorNum) => this.performScale(vectorNum),
      onDot: () => this.performDot(),
      onProject: () => this.performProject(),
      onAngle: () => this.performAngleBetween(),
      onNormalize: (vectorNum) => this.performNormalize(vectorNum),
      onPerpendicular: (vectorNum) => this.performPerpendicular(vectorNum),
      onReflectV1: () => this.performReflect(1),
      onReflectV2: () => this.performReflect(2),
      onLinearCombo: () => this.performLinearCombination(),
      onLinearComboInputChange: () => this.sidebar.updateLinearComboButton()
    });
  }

  loadColors() {
    // Load theme-responsive colors from CanvasThemeService
    const themeColors = window.CanvasThemeService
      ? window.CanvasThemeService.getColors()
      : {
          grid: this.styleConstants.colors.grid,
          axis: this.styleConstants.colors.axis,
          text: this.styleConstants.colors.text,
          hover: this.styleConstants.colors.hover,
          hoverHighlight: this.styleConstants.colors.hoverHighlight
        };

    // Store colors with vector-specific colors from styleConstants
    this.colors = {
      ...themeColors,
      vector1: this.styleConstants.colors.vector1,
      vector2: this.styleConstants.colors.vector2,
      result: this.styleConstants.colors.result
    };

    // Update CoordinateSystem colors if it exists
    if (this.coordSystem) {
      const coordColors = {
        grid: this.colors.grid,
        axis: this.colors.axis,
        text: this.colors.text,
        hover: this.colors.hover,
        hoverHighlight: this.colors.hoverHighlight
      };
      this.coordSystem.updateColors(coordColors);
    }

    // Update canvas renderer colors
    if (this.canvasRenderer) {
      this.canvasRenderer.updateColors(this.colors);
    }
  }

  // ============================================================================
  // COORDINATE TRANSFORMATIONS (delegated to canvas renderer)
  // ============================================================================

  screenToMath(screenX, screenY) {
    return this.canvasRenderer.screenToMath(screenX, screenY);
  }

  mathToScreen(mathX, mathY) {
    return this.canvasRenderer.mathToScreen(mathX, mathY);
  }

  snapToGrid(value) {
    return this.canvasRenderer.snapToGrid(value);
  }

  // Check if mouse is near vector endpoint (for editing)
  checkEndpointHit(mouseScreenX, mouseScreenY) {
    return this.canvasRenderer.checkEndpointHit(mouseScreenX, mouseScreenY, this.vector1, this.vector2);
  }

  // ============================================================================
  // RENDERING (delegated to canvas renderer)
  // ============================================================================

  render() {
    // Render canvas only - no UI updates during render
    this.canvasRenderer.render({
      vector1: this.vector1,
      vector2: this.vector2,
      resultVector: this.resultVector,
      drawingVector: this.drawingVector,
      isDrawing: this.isDrawing,
      hoveredVector: this.hoveredVector,
      angleArcState: this.angleArcState,
      parallelogramState: this.parallelogramState
    });
  }

  // ============================================================================
  // UI UPDATES (event-driven, not called during render)
  // ============================================================================

  /**
   * Update UI elements (called only when state changes, not during render)
   */
  updateUI() {
    // Update vector info display
    this.sidebar.updateVectorInfo(this.vector1, this.vector2, this.coordinateMode);

    // Update button states
    this.sidebar.updateButtonStates(this.vector1, this.vector2);

    // Update operation group visibility
    this.sidebar.updateOperationGroupVisibility(this.appConfig);
  }

  // ============================================================================
  // MOUSE INTERACTION
  // ============================================================================

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  handleMouseDown(e) {
    if (this.isAnimating) return;

    const pos = this.getMousePos(e);
    const mathPos = this.screenToMath(pos.x, pos.y);

    // Check if clicking on an existing vector endpoint for editing
    const hitVector = this.checkEndpointHit(pos.x, pos.y);

    if (hitVector) {
      // Start editing existing vector
      this.isEditing = true;
      this.editTarget = hitVector;
      this.canvas.classList.add('dragging');
      return;
    }

    // Not editing - start drawing a new vector
    this.startPos = {
      x: this.snapToGrid(mathPos.x),
      y: this.snapToGrid(mathPos.y)
    };

    // Start drawing a new vector
    if (!this.vector1) {
      this.isDrawing = true;
      this.drawingVector = new Vector(0, 0, this.styleConstants.colors.vector1, 'v₁');
    } else if (!this.vector2 && this.appConfig.vectorMode.maxVectors >= 2) {
      this.isDrawing = true;
      this.drawingVector = new Vector(0, 0, this.styleConstants.colors.vector2, 'v₂');
    }

    this.canvas.classList.add('dragging');
  }

  handleMouseMove(e) {
    const pos = this.getMousePos(e);

    // Handle editing mode
    if (this.isEditing) {
      const mathPos = this.screenToMath(pos.x, pos.y);
      const snappedX = this.snapToGrid(mathPos.x);
      const snappedY = this.snapToGrid(mathPos.y);

      // Update the vector being edited
      if (this.editTarget === 'vector1' && this.vector1) {
        this.vector1.x = snappedX;
        this.vector1.y = snappedY;
      } else if (this.editTarget === 'vector2' && this.vector2) {
        this.vector2.x = snappedX;
        this.vector2.y = snappedY;
      }

      // Clear result vector, parallelogram, and angle arc when editing
      this.resultVector = null;
      this.parallelogramState = null;
      this.angleArcState = null;
      this.updateUI(); // Update UI when vector changes
      this.render();
      return;
    }

    // Handle drawing mode
    if (this.isDrawing) {
      const mathPos = this.screenToMath(pos.x, pos.y);
      const snappedX = this.snapToGrid(mathPos.x);
      const snappedY = this.snapToGrid(mathPos.y);

      this.drawingVector.x = snappedX - this.startPos.x;
      this.drawingVector.y = snappedY - this.startPos.y;

      this.render();
      return;
    }

    // Handle hover detection (when not drawing or editing)
    const hitVector = this.checkEndpointHit(pos.x, pos.y);
    if (hitVector !== this.hoveredVector) {
      this.hoveredVector = hitVector;
      this.canvas.style.cursor = hitVector ? 'pointer' : 'crosshair';
      this.render();
    }
  }

  handleMouseUp(e) {
    // Handle editing mode
    if (this.isEditing) {
      // Log vector editing
      if (this.editTarget === 'vector1' && this.vector1) {
        const mag = this.vector1.magnitude().toFixed(2);
        const angle = this.vector1.angleDegrees().toFixed(2);
        logAction(`Vector edited: v1 to (${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}), magnitude: ${mag}, angle: ${angle}°`);
      } else if (this.editTarget === 'vector2' && this.vector2) {
        const mag = this.vector2.magnitude().toFixed(2);
        const angle = this.vector2.angleDegrees().toFixed(2);
        logAction(`Vector edited: v2 to (${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}), magnitude: ${mag}, angle: ${angle}°`);
      }

      this.isEditing = false;
      this.editTarget = null;
      this.canvas.classList.remove('dragging');

      // Check hover state after editing
      const pos = this.getMousePos(e);
      const hitVector = this.checkEndpointHit(pos.x, pos.y);
      this.hoveredVector = hitVector;
      this.canvas.style.cursor = hitVector ? 'pointer' : 'crosshair';

      this.updateUI(); // Update UI after editing
      this.render();
      return;
    }

    // Handle drawing mode
    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.canvas.classList.remove('dragging');

    // Only create vector if it has non-zero magnitude
    if (this.drawingVector && (this.drawingVector.x !== 0 || this.drawingVector.y !== 0)) {
      if (!this.vector1) {
        this.vector1 = this.drawingVector;
        // Log vector creation
        const mag = this.vector1.magnitude().toFixed(2);
        const angle = this.vector1.angleDegrees().toFixed(2);
        logAction(`Vector created: v1 at (${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}), magnitude: ${mag}, angle: ${angle}°`);
      } else if (!this.vector2 && this.appConfig.vectorMode.maxVectors >= 2) {
        // Only allow second vector if maxVectors is 2 or more
        this.vector2 = this.drawingVector;
        // Log vector creation
        const mag = this.vector2.magnitude().toFixed(2);
        const angle = this.vector2.angleDegrees().toFixed(2);
        logAction(`Vector created: v2 at (${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}), magnitude: ${mag}, angle: ${angle}°`);
      }
      this.resultVector = null; // Clear any previous result
      this.updateUI(); // Update UI when vector is created
    }

    this.drawingVector = null;
    this.render();
  }

  handleMouseLeave(e) {
    if (this.isDrawing || this.isEditing) {
      this.handleMouseUp(e);
    }

    // Clear hover state when leaving canvas
    this.hoveredVector = null;
    this.canvas.style.cursor = 'crosshair';
  }

  // ============================================================================
  // VECTOR OPERATIONS (delegated to operations module)
  // ============================================================================

  clearAll() {
    this.vector1 = null;
    this.vector2 = null;
    this.resultVector = null;
    this.parallelogramState = null;
    this.angleArcState = null;
    this.sidebar.clearResults(); // Clear results panel
    this.updateUI(); // Update UI after clearing
    this.render();
    // Log canvas clear
    logAction('Canvas cleared');
  }

  performAdd() {
    const opResult = this.operations.add(this.vector1, this.vector2);
    if (!opResult) return;

    // Animate parallelogram construction
    this.animateParallelogram(
      opResult.resultVector,
      opResult.parallelogramVectors.v1,
      opResult.parallelogramVectors.v2,
      opResult.parallelogramVectors.negatedV2,
      () => {
        this.sidebar.displayResult(...opResult.resultLines);
      }
    );
  }

  performSubtract() {
    const opResult = this.operations.subtract(this.vector1, this.vector2);
    if (!opResult) return;

    // Animate parallelogram with v1 and -v2
    this.animateParallelogram(
      opResult.resultVector,
      opResult.parallelogramVectors.v1,
      opResult.parallelogramVectors.v2,
      opResult.parallelogramVectors.negatedV2,
      () => {
        this.sidebar.displayResult(...opResult.resultLines);
      }
    );
  }

  performScale(vectorNum) {
    const scalar = this.sidebar.getScalarInput();
    if (isNaN(scalar)) return;

    const vector = vectorNum === 1 ? this.vector1 : this.vector2;
    const opResult = this.operations.scale(vector, scalar, vectorNum);
    if (!opResult) return;

    // Clear visualization states
    if (opResult.clearParallelogram) this.parallelogramState = null;
    if (opResult.clearAngleArc) this.angleArcState = null;

    // Animate result
    this.animateToResult(opResult.resultVector, () => {
      this.sidebar.displayResult(...opResult.resultLines);
    });
  }

  performDot() {
    const opResult = this.operations.dot(this.vector1, this.vector2);
    if (!opResult) return;

    // Clear visualization states
    if (opResult.clearParallelogram) this.parallelogramState = null;
    if (opResult.clearAngleArc) this.angleArcState = null;

    this.resultVector = null;
    this.render();
    this.sidebar.displayResult(...opResult.resultLines);
  }

  performProject() {
    const opResult = this.operations.project(this.vector1, this.vector2);
    if (!opResult) return;

    // Clear visualization states
    if (opResult.clearParallelogram) this.parallelogramState = null;
    if (opResult.clearAngleArc) this.angleArcState = null;

    // Animate result
    this.animateToResult(opResult.resultVector, () => {
      this.sidebar.displayResult(...opResult.resultLines);
    });
  }

  performAngleBetween() {
    const opResult = this.operations.angleBetween(this.vector1, this.vector2);
    if (!opResult) return;

    // Clear visualization states
    if (opResult.clearParallelogram) this.parallelogramState = null;
    if (opResult.angleArcState) this.angleArcState = opResult.angleArcState;

    this.resultVector = null;
    this.render();
    this.sidebar.displayResult(...opResult.resultLines);
  }

  performNormalize(vectorNum) {
    const vector = vectorNum === 1 ? this.vector1 : this.vector2;
    const opResult = this.operations.normalize(vector, vectorNum);
    if (!opResult) return;

    // Clear visualization states
    if (opResult.clearParallelogram) this.parallelogramState = null;
    if (opResult.clearAngleArc) this.angleArcState = null;

    // Animate result
    this.animateToResult(opResult.resultVector, () => {
      this.sidebar.displayResult(...opResult.resultLines);
    });
  }

  performPerpendicular(vectorNum) {
    const vector = vectorNum === 1 ? this.vector1 : this.vector2;
    const opResult = this.operations.perpendicular(vector, vectorNum);
    if (!opResult) return;

    // Clear visualization states
    if (opResult.clearParallelogram) this.parallelogramState = null;
    if (opResult.clearAngleArc) this.angleArcState = null;

    // Animate result
    this.animateToResult(opResult.resultVector, () => {
      this.sidebar.displayResult(...opResult.resultLines);
    });
  }

  performReflect(vectorNum) {
    const vector = vectorNum === 1 ? this.vector1 : this.vector2;
    const reflectionType = this.sidebar.getReflectionType(vectorNum);
    const opResult = this.operations.reflect(vector, vectorNum, reflectionType);
    if (!opResult) return;

    // Clear visualization states
    if (opResult.clearParallelogram) this.parallelogramState = null;
    if (opResult.clearAngleArc) this.angleArcState = null;

    // Animate result
    this.animateToResult(opResult.resultVector, () => {
      this.sidebar.displayResult(...opResult.resultLines);
    });
  }

  performLinearCombination() {
    const { scalarA, scalarB } = this.sidebar.getLinearComboScalars();
    if (isNaN(scalarA) || isNaN(scalarB)) return;

    const opResult = this.operations.linearCombination(this.vector1, this.vector2, scalarA, scalarB);
    if (!opResult) return;

    // Animate with parallelogram showing scaled vectors
    this.animateParallelogram(
      opResult.resultVector,
      opResult.parallelogramVectors.v1,
      opResult.parallelogramVectors.v2,
      opResult.parallelogramVectors.negatedV2,
      () => {
        this.sidebar.displayResult(...opResult.resultLines);
      },
      opResult.parallelogramVectors
    );
  }

  // ============================================================================
  // ANIMATION
  // ============================================================================

  animateToResult(targetVector, onComplete) {
    this.isAnimating = true;
    this.animationFrom = this.resultVector ? this.resultVector.clone() : new Vector(0, 0, targetVector.color, '');
    this.animationTo = targetVector;

    // Use Animator for animation loop
    this.animationControl = Animator.animate({
      duration: this.styleConstants.animationDuration,
      easingFunction: Animator.easeOutCubic,
      onFrame: (eased) => {
        // Use Animator.lerpVector for interpolation
        this.resultVector = Animator.lerpVector(this.animationFrom, this.animationTo, eased);
        this.render(); // Only render canvas, no UI updates
      },
      onComplete: () => {
        this.isAnimating = false;
        this.resultVector = this.animationTo;
        this.render();
        if (onComplete) onComplete();
      }
    });
  }

  /**
   * Animate parallelogram construction with staggered phases
   * Phase 1 (0-200ms): Fade in edges
   * Phase 2 (0-400ms): Draw translated v2 from v1's tip
   * Phase 3 (200-600ms): Draw translated v1 from v2's tip (overlaps phase 2)
   * Then triggers result vector animation
   *
   * @param {Vector} resultVector - The final result vector to animate after parallelogram
   * @param {Vector} vector1 - First vector (usually v₁)
   * @param {Vector} vector2 - Second vector (v₂ for addition, -v₂ for subtraction)
   * @param {Vector} negatedVector2 - For subtraction: -v₂ to draw dashed; null for addition
   * @param {Function} onComplete - Callback when all animations complete
   * @param {Object} linearComboData - Optional: {scaledV1, scaledV2, scalarA, scalarB} for linear combination visualization
   */
  animateParallelogram(resultVector, vector1, vector2, negatedVector2, onComplete, linearComboData = null) {
    this.parallelogramState = {
      startTime: performance.now(),
      v1Progress: 0,
      v2Progress: 0,
      edgeOpacity: 0,
      useVector1: vector1,
      useVector2: vector2,
      negatedVector2: negatedVector2,
      isLinearCombination: linearComboData !== null,
      scaledV1: linearComboData?.scaledV1 || null,
      scaledV2: linearComboData?.scaledV2 || null,
      scalarA: linearComboData?.scalarA || null,
      scalarB: linearComboData?.scalarB || null
    };

    const totalDuration = this.styleConstants.parallelogram.staggerDelay + this.styleConstants.parallelogram.translateDuration;

    const animate = (currentTime) => {
      const elapsed = currentTime - this.parallelogramState.startTime;

      // Phase 1: Fade in edges (0-200ms)
      if (elapsed < this.styleConstants.parallelogram.edgeFadeInDuration) {
        this.parallelogramState.edgeOpacity = elapsed / this.styleConstants.parallelogram.edgeFadeInDuration;
      } else {
        this.parallelogramState.edgeOpacity = 1;
      }

      // Phase 2: Draw translated v2 from v1's tip (0-400ms)
      const v2Progress = Math.min(elapsed / this.styleConstants.parallelogram.translateDuration, 1);
      // Use Animator easing function
      this.parallelogramState.v2Progress = Animator.easeOutCubic(v2Progress);

      // Phase 3: Draw translated v1 from v2's tip (200-600ms, overlaps phase 2)
      const v1StartTime = this.styleConstants.parallelogram.staggerDelay;
      const v1Elapsed = Math.max(0, elapsed - v1StartTime);
      const v1Progress = Math.min(v1Elapsed / this.styleConstants.parallelogram.translateDuration, 1);
      // Use Animator easing function
      this.parallelogramState.v1Progress = Animator.easeOutCubic(v1Progress);

      this.render(); // Only render canvas, no UI updates

      if (elapsed < totalDuration) {
        requestAnimationFrame(animate);
      } else {
        // Parallelogram animation complete, now animate result vector
        this.parallelogramState.v1Progress = 1;
        this.parallelogramState.v2Progress = 1;
        this.parallelogramState.edgeOpacity = 1;
        this.render();

        // Trigger result vector animation
        this.animateToResult(resultVector, onComplete);
      }
    };

    requestAnimationFrame(animate);
  }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Initialize the mode (called after construction)
   */
  init() {
    // Already initialized in constructor
  }

  /**
   * Get all current vectors for collision detection
   * @returns {Array<Vector>} Array of current vectors
   */
  getVectors() {
    const vectors = [];
    if (this.vector1) vectors.push(this.vector1);
    if (this.vector2) vectors.push(this.vector2);
    if (this.resultVector) vectors.push(this.resultVector);
    return vectors;
  }

  /**
   * Clean up resources when mode is destroyed
   */
  destroy() {
    // Remove canvas event listeners
    if (this.canvasEventListeners) {
      this.canvasEventListeners.forEach(({ element, event, handler }) => {
        if (element && typeof element.removeEventListener === 'function') {
          element.removeEventListener(event, handler);
        }
      });
      this.canvasEventListeners = [];
    }

    // Unsubscribe from theme service
    if (this.themeUnsubscribe) {
      this.themeUnsubscribe();
      this.themeUnsubscribe = null;
    }

    // Clean up sidebar
    if (this.sidebar) {
      this.sidebar.destroy();
    }

    // Clear resize callback
    if (this.coordSystem) {
      this.coordSystem.setResizeCallback(null);
    }

    // Cancel any running animations
    if (this.animationControl) {
      this.animationControl.cancel();
      this.animationControl = null;
    }

    // Clear state
    this.vector1 = null;
    this.vector2 = null;
    this.resultVector = null;
    this.parallelogramState = null;
    this.angleArcState = null;
    this.isAnimating = false;
    this.isDrawing = false;
    this.isEditing = false;
    this.editTarget = null;
    this.hoveredVector = null;
  }
}
