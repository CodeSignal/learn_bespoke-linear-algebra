/**
 * VectorMode Class
 * Handles vector visualization, operations, and interactions
 */

class VectorMode {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config || CONFIG;

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
    this.isDragging = false;
    this.dragTarget = null;
    this.drawingVector = null;
    this.mousePos = { x: 0, y: 0 };
    this.startPos = { x: 0, y: 0 };

    // Hover state
    this.hoveredVector = null; // 'vector1' or 'vector2' or null

    // Animation state
    this.isAnimating = false;
    this.animationStartTime = 0;
    this.animationFrom = null;
    this.animationTo = null;

    // Parallelogram animation state
    this.parallelogramState = null; // { startTime, v1Progress, v2Progress, edgeOpacity }

    // Angle arc visualization state
    this.angleArcState = null; // { vector1, vector2, angleRadians, angleDegrees }

    // Color cache for theme-responsive rendering
    this.colors = {};

    // Load colors from CSS (standardized approach)
    this.loadColorsFromCSS();

    // Create CoordinateSystem instance with auto-setup
    // Use colors from CSS, CoordinateSystem will handle canvas setup
    const coordColors = {
      grid: this.colors.grid,
      axis: this.colors.axis,
      text: this.colors.text,
      hover: this.colors.hover,
      hoverHighlight: this.colors.hoverHighlight
    };
    this.coordSystem = new CoordinateSystem(canvas, coordColors);

    // Set up resize callback to trigger render
    this.coordSystem.setResizeCallback(() => {
      this.render();
    });

    // Store dimensions from CoordinateSystem for coordinate transformations
    this.updateDimensions();

    // Initialize
    this.setupThemeListener();   // Watch for theme changes
    this.setupEventListeners();
    this.render();
  }

  /**
   * Update dimensions from CoordinateSystem (called after CoordinateSystem setup)
   */
  updateDimensions() {
    this.width = this.coordSystem.width;
    this.height = this.coordSystem.height;
    this.centerX = this.coordSystem.centerX;
    this.centerY = this.coordSystem.centerY;
  }

  setupEventListeners() {
    // Canvas mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));

    // Canvas reset button
    document.getElementById('canvas-reset').addEventListener('click', () => this.clearAll());

    // Coordinate mode toggle
    document.getElementById('coord-mode').addEventListener('change', (e) => {
      this.coordinateMode = e.target.value;
      this.updateUI();
    });

    document.getElementById('op-add').addEventListener('click', () => this.performAdd());
    document.getElementById('op-subtract').addEventListener('click', () => this.performSubtract());
    document.getElementById('op-scale').addEventListener('click', () => {
      const select = document.getElementById('scale-vector-select');
      const vectorNum = select.value === 'v1' ? 1 : 2;
      this.performScale(vectorNum);
    });
    document.getElementById('op-dot').addEventListener('click', () => this.performDot());

    // New operation buttons
    document.getElementById('op-project').addEventListener('click', () => this.performProject());
    document.getElementById('op-angle').addEventListener('click', () => this.performAngleBetween());

    // Normalize and perpendicular with dropdown selection
    document.getElementById('op-normalize').addEventListener('click', () => {
      const select = document.getElementById('normalize-vector-select');
      const vectorNum = select.value === 'v1' ? 1 : 2;
      this.performNormalize(vectorNum);
    });

    document.getElementById('op-perpendicular').addEventListener('click', () => {
      const select = document.getElementById('perpendicular-vector-select');
      const vectorNum = select.value === 'v1' ? 1 : 2;
      this.performPerpendicular(vectorNum);
    });

    // Reflection operation buttons
    document.getElementById('op-reflect-v1').addEventListener('click', () => this.performReflect(1));
    document.getElementById('op-reflect-v2').addEventListener('click', () => this.performReflect(2));

    // Linear combination button
    document.getElementById('op-linear-combo').addEventListener('click', () => this.performLinearCombination());

    // Linear combination input listeners to update button text
    document.getElementById('lc-scalar-a').addEventListener('input', () => this.updateLinearComboButton());
    document.getElementById('lc-scalar-b').addEventListener('input', () => this.updateLinearComboButton());
  }

  loadColorsFromCSS() {
    // Load theme-responsive colors from CSS using ColorUtils
    const colors = window.ColorUtils
      ? window.ColorUtils.getColorsFromCSS()
      : {
          grid: CONFIG.colors.grid,
          axis: CONFIG.colors.axis,
          text: CONFIG.colors.text,
          hover: CONFIG.colors.hover,
          hoverHighlight: CONFIG.colors.hoverHighlight
        };

    // Store colors with vector-specific colors from config
    this.colors = {
      ...colors,
      vector1: this.config.colors.vector1,
      vector2: this.config.colors.vector2,
      result: this.config.colors.result
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
  }

  setupThemeListener() {
    // Listen for system theme changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    darkModeQuery.addEventListener('change', () => {
      this.loadColorsFromCSS();  // Reload colors (updates CoordinateSystem automatically)
      this.render();             // Re-render canvas
    });
  }

  // ============================================================================
  // COORDINATE TRANSFORMATIONS
  // ============================================================================

  screenToMath(screenX, screenY) {
    // Use CoordinateSystem's transformation methods
    return this.coordSystem.screenToMath(screenX, screenY);
  }

  mathToScreen(mathX, mathY) {
    // Use CoordinateSystem's transformation methods
    return this.coordSystem.mathToScreen(mathX, mathY);
  }

  snapToGrid(value) {
    return Math.round(value * 2) / 2; // Snap to 0.5 increments
  }

  // Check if mouse is near vector endpoint (for editing)
  checkEndpointHit(mouseScreenX, mouseScreenY) {
    const checkVector = (vector) => {
      if (!vector) return false;
      const endpoint = this.mathToScreen(vector.x, vector.y);
      const dx = mouseScreenX - endpoint.x;
      const dy = mouseScreenY - endpoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= this.config.hitRadius;
    };

    // Check vector1 first, then vector2
    if (this.vector1 && checkVector(this.vector1)) {
      return 'vector1';
    }
    if (this.vector2 && checkVector(this.vector2)) {
      return 'vector2';
    }
    return null;
  }

  // ============================================================================
  // RENDERING
  // ============================================================================

  render() {
    // Update dimensions from CoordinateSystem (in case of resize)
    this.updateDimensions();

    // Use CoordinateSystem's clear method
    this.coordSystem.clear();

    // Use CoordinateSystem for grid and axes
    this.coordSystem.drawGrid();
    this.coordSystem.drawAxes();

    // Draw vectors with hover state using CoordinateSystem
    if (this.vector1) this.coordSystem.drawVector(this.vector1, this.config, this.colors, false, 1, this.hoveredVector === 'vector1');
    if (this.vector2) this.coordSystem.drawVector(this.vector2, this.config, this.colors, false, 1, this.hoveredVector === 'vector2');

    // Draw angle arc if angle visualization is active
    if (this.angleArcState) {
      this.drawAngleArc(
        this.angleArcState.vector1,
        this.angleArcState.vector2,
        this.angleArcState.angleRadians,
        this.angleArcState.angleDegrees
      );
    }

    // Draw negated vector for subtraction (dashed style, similar to parallelogram edges)
    if (this.parallelogramState && this.parallelogramState.negatedVector2) {
      this.coordSystem.drawVector(
        this.parallelogramState.negatedVector2,
        this.config,
        this.colors,
        true,  // dashed
        0.5,   // 50% opacity like parallelogram edges
        false  // no hover
      );
    }

    // Draw scaled vectors from origin for linear combination visualization
    if (this.parallelogramState && this.parallelogramState.isLinearCombination) {
      const scaledV1 = this.parallelogramState.scaledV1;
      const scaledV2 = this.parallelogramState.scaledV2;

      // Calculate opacity with fade-in effect during animation
      const baseOpacity = this.config.parallelogram.opacity;
      const currentOpacity = baseOpacity * this.parallelogramState.edgeOpacity;

      if (scaledV1) {
        // Draw scaled v1 (av₁) from origin as dashed vector
        this.coordSystem.drawVector(
          scaledV1,
          this.config,
          this.colors,
          true,  // dashed
          currentOpacity,  // Use computed opacity with fade-in
          false  // no hover
        );
      }

      if (scaledV2) {
        // Draw scaled v2 (bv₂) from origin as dashed vector
        this.coordSystem.drawVector(
          scaledV2,
          this.config,
          this.colors,
          true,  // dashed
          currentOpacity,  // Use computed opacity with fade-in
          false  // no hover
        );
      }
    }

    // Draw parallelogram edges (if animating)
    if (this.parallelogramState && this.parallelogramState.useVector1 && this.parallelogramState.useVector2) {
      // Apply edge opacity for fade-in effect
      const savedOpacity = this.config.parallelogram.opacity;
      this.config.parallelogram.opacity = savedOpacity * this.parallelogramState.edgeOpacity;

      const v1 = this.parallelogramState.useVector1;
      const v2 = this.parallelogramState.useVector2;

      // Draw v2 translated to v1's tip (with progress for animation)
      this.coordSystem.drawTranslatedVector(
        v2,
        { x: v1.x, y: v1.y },
        this.config,
        this.parallelogramState.v2Progress,
        this.config.parallelogram.v2CopyColor
      );

      // Draw v1 translated to v2's tip (with progress for animation)
      this.coordSystem.drawTranslatedVector(
        v1,
        { x: v2.x, y: v2.y },
        this.config,
        this.parallelogramState.v1Progress,
        this.config.parallelogram.v1CopyColor
      );

      // Restore original opacity
      this.config.parallelogram.opacity = savedOpacity;
    }

    if (this.resultVector) this.coordSystem.drawVector(this.resultVector, this.config, this.colors, true, 1, false);

    // Draw vector being created
    if (this.isDrawing && this.drawingVector) {
      this.coordSystem.drawVector(this.drawingVector, this.config, this.colors, false, 0.5, false);
    }

    this.updateUI();
  }


  /**
   * Draw an angle arc between two vectors at the origin
   * @param {Vector} vector1 - First vector
   * @param {Vector} vector2 - Second vector
   * @param {number} angleRadians - Angle in radians
   * @param {number} angleDegrees - Angle in degrees for label
   */
  drawAngleArc(vector1, vector2, angleRadians, angleDegrees) {
    const origin = this.mathToScreen(0, 0);

    // Calculate arc radius (60 pixels or 20% of smaller vector, whichever is smaller)
    const mag1 = vector1.magnitude() * this.config.gridSize;
    const mag2 = vector2.magnitude() * this.config.gridSize;
    const maxRadius = 60;
    const minRadius = 30;
    const arcRadius = Math.min(maxRadius, Math.max(minRadius, Math.min(mag1, mag2) * 0.4));

    // Get angles for both vectors (in screen coordinates, y is inverted)
    const angle1 = Math.atan2(-vector1.y, vector1.x);  // Negative y because screen y is inverted
    const angle2 = Math.atan2(-vector2.y, vector2.x);

    // Determine start and end angles (ensure we draw the smaller arc)
    let startAngle = angle1;
    let endAngle = angle2;

    // Normalize angles to 0-2π range
    if (startAngle < 0) startAngle += Math.PI * 2;
    if (endAngle < 0) endAngle += Math.PI * 2;

    // Swap if needed to draw counterclockwise from smaller to larger
    if (startAngle > endAngle) {
      [startAngle, endAngle] = [endAngle, startAngle];
    }

    // If the arc would be > 180°, draw the other way
    if (endAngle - startAngle > Math.PI) {
      [startAngle, endAngle] = [endAngle, startAngle];
    }

    this.ctx.save();

    // Draw filled arc sector
    this.ctx.beginPath();
    this.ctx.moveTo(origin.x, origin.y);
    this.ctx.arc(origin.x, origin.y, arcRadius, startAngle, endAngle);
    this.ctx.closePath();

    // Fill with semi-transparent purple/amber color
    this.ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';  // Purple with 20% opacity
    this.ctx.fill();

    // Draw arc outline for better visibility
    this.ctx.beginPath();
    this.ctx.arc(origin.x, origin.y, arcRadius, startAngle, endAngle);
    this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';  // Purple with 60% opacity
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw angle label at midpoint of arc
    const midAngle = (startAngle + endAngle) / 2;
    const labelRadius = arcRadius * 0.6;  // Place label at 60% of arc radius
    const labelX = origin.x + labelRadius * Math.cos(midAngle);
    const labelY = origin.y + labelRadius * Math.sin(midAngle);

    this.ctx.font = 'bold 14px serif';
    this.ctx.fillStyle = 'rgb(147, 51, 234)';  // Darker purple for text
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${angleDegrees.toFixed(1)}°`, labelX, labelY);

    this.ctx.restore();
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
      this.drawingVector = new Vector(0, 0, this.config.colors.vector1, 'v₁');
    } else if (!this.vector2 && this.config.maxVectors >= 2) {
      this.isDrawing = true;
      this.drawingVector = new Vector(0, 0, this.config.colors.vector2, 'v₂');
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
      } else if (!this.vector2 && this.config.maxVectors >= 2) {
        // Only allow second vector if maxVectors is 2 or more
        this.vector2 = this.drawingVector;
        // Log vector creation
        const mag = this.vector2.magnitude().toFixed(2);
        const angle = this.vector2.angleDegrees().toFixed(2);
        logAction(`Vector created: v2 at (${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}), magnitude: ${mag}, angle: ${angle}°`);
      }
      this.resultVector = null; // Clear any previous result
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
  // VECTOR OPERATIONS
  // ============================================================================

  clearAll() {
    this.vector1 = null;
    this.vector2 = null;
    this.resultVector = null;
    this.parallelogramState = null;
    this.angleArcState = null;
    this.render();
    // Log canvas clear
    logAction('Canvas cleared');
  }

  performAdd() {
    if (!this.vector1 || !this.vector2) return;

    const result = this.vector1.add(this.vector2);
    result.label = 'v₁ + v₂';

    // Log operation
    logAction(`Add operation: v1 (${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}) + v2 (${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}). Result: (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`);

    // Animate parallelogram construction with v1 and v2, no negated vector
    this.animateParallelogram(result, this.vector1, this.vector2, null, () => {
      const formula = `v₁ + v₂ = [${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}] + [${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}]`;
      const resultText = `= [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;
      this.displayResult(formula, resultText);
    });
  }

  performSubtract() {
    if (!this.vector1 || !this.vector2) return;

    const result = this.vector1.subtract(this.vector2);
    result.label = 'v₁ - v₂';

    // Log operation
    logAction(`Subtract operation: v1 (${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}) - v2 (${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}). Result: (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`);

    // Create negated v2 for parallelogram visualization (v1 - v2 = v1 + (-v2))
    const negV2 = new Vector(
      -this.vector2.x,
      -this.vector2.y,
      this.vector2.color,
      '-v₂'
    );

    // Animate parallelogram with v1 and -v2, show both v2 (solid) and -v2 (dashed)
    this.animateParallelogram(result, this.vector1, negV2, negV2, () => {
      const formula = `v₁ - v₂ = [${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}] - [${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}]`;
      const resultText = `= [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;
      this.displayResult(formula, resultText);
    });
  }

  performScale(vectorNum) {
    const scalar = parseFloat(document.getElementById('scalar-input').value);
    if (isNaN(scalar)) return;

    // Clear parallelogram and angle arc from previous operations
    this.parallelogramState = null;
    this.angleArcState = null;

    let vector, result;

    if (vectorNum === 1 && this.vector1) {
      vector = this.vector1;
      result = vector.scale(scalar);
      result.label = `${scalar}v₁`;
      result.color = this.config.colors.result;  // Use green for scaled vectors
    } else if (vectorNum === 2 && this.vector2) {
      vector = this.vector2;
      result = vector.scale(scalar);
      result.label = `${scalar}v₂`;
      result.color = this.config.colors.result;  // Use green for scaled vectors
    } else {
      return;
    }

    // Log operation
    logAction(`Scale operation: v${vectorNum} (${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}) * ${scalar}. Result: (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`);

    this.animateToResult(result, () => {
      const formula = `${scalar}v${vectorNum} = ${scalar} × [${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}]`;
      const resultText = `= [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;
      this.displayResult(formula, resultText);
    });
  }

  performDot() {
    if (!this.vector1 || !this.vector2) return;

    // Clear parallelogram and angle arc from previous operations
    this.parallelogramState = null;
    this.angleArcState = null;

    const dotProduct = this.vector1.dot(this.vector2);

    // Log operation
    logAction(`Dot product: v1 (${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}) · v2 (${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}). Result: ${dotProduct.toFixed(2)}`);

    const formula = `v₁ · v₂ = [${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}] · [${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}]`;
    const calculation = `= (${this.vector1.x.toFixed(1)} × ${this.vector2.x.toFixed(1)}) + (${this.vector1.y.toFixed(1)} × ${this.vector2.y.toFixed(1)})`;
    const resultText = `= ${dotProduct.toFixed(2)}`;

    this.resultVector = null;
    this.render();
    this.displayResult(formula, calculation, resultText);
  }

  performProject() {
    if (!this.vector1 || !this.vector2) return;

    // Clear parallelogram and angle arc from previous operations
    this.parallelogramState = null;
    this.angleArcState = null;

    const result = this.vector1.projectOnto(this.vector2);
    result.label = 'proj_v₂(v₁)';

    // Log operation
    logAction(`Project operation: v1 (${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}) onto v2 (${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}). Result: (${result.x.toFixed(2)}, ${result.y.toFixed(2)})`);

    this.animateToResult(result, () => {
      const dotProduct = this.vector1.dot(this.vector2);
      const mag2Squared = this.vector2.x * this.vector2.x + this.vector2.y * this.vector2.y;
      const scalar = dotProduct / mag2Squared;

      const formula = `proj_v₂(v₁) = ((v₁·v₂)/(v₂·v₂)) × v₂`;
      const calculation = `= ((${dotProduct.toFixed(2)})/(${mag2Squared.toFixed(2)})) × [${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}]`;
      const resultText = `= [${result.x.toFixed(2)}, ${result.y.toFixed(2)}]`;
      this.displayResult(formula, calculation, resultText);
    });
  }

  performAngleBetween() {
    if (!this.vector1 || !this.vector2) return;

    // Clear parallelogram from previous add/subtract operations
    this.parallelogramState = null;

    const angleRad = this.vector1.angleBetween(this.vector2);
    const angleDeg = this.vector1.angleBetweenDegrees(this.vector2);

    // Log operation
    logAction(`Angle between: v1 (${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}) and v2 (${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}). Result: ${angleDeg.toFixed(2)}°`);

    // Set angle arc state for visualization
    this.angleArcState = {
      vector1: this.vector1,
      vector2: this.vector2,
      angleRadians: angleRad,
      angleDegrees: angleDeg
    };

    const dotProduct = this.vector1.dot(this.vector2);
    const mag1 = this.vector1.magnitude();
    const mag2 = this.vector2.magnitude();

    const formula = `θ = arccos((v₁·v₂)/(||v₁||×||v₂||))`;
    const calculation = `= arccos((${dotProduct.toFixed(2)})/(${mag1.toFixed(2)}×${mag2.toFixed(2)}))`;
    const resultText = `= ${angleDeg.toFixed(2)}° (${angleRad.toFixed(3)} radians)`;

    this.resultVector = null;
    this.render();
    this.displayResult(formula, calculation, resultText);
  }

  performNormalize(vectorNum) {
    // Clear parallelogram and angle arc from previous operations
    this.parallelogramState = null;
    this.angleArcState = null;

    let vector, result;

    if (vectorNum === 1 && this.vector1) {
      vector = this.vector1;
      result = vector.normalize();
      result.label = 'û₁';
      result.color = this.config.colors.result;  // Use green for normalized vectors
      result.lineWidth = 4;  // Thicker line for better visibility
    } else if (vectorNum === 2 && this.vector2) {
      vector = this.vector2;
      result = vector.normalize();
      result.label = 'û₂';
      result.color = this.config.colors.result;  // Use green for normalized vectors
      result.lineWidth = 4;  // Thicker line for better visibility
    } else {
      return;
    }

    // Log operation
    logAction(`Normalize operation: v${vectorNum} (${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}). Result: (${result.x.toFixed(3)}, ${result.y.toFixed(3)})`);

    this.animateToResult(result, () => {
      const mag = vector.magnitude();
      const formula = `û${vectorNum} = v${vectorNum}/||v${vectorNum}||`;
      const calculation = `= [${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}]/${mag.toFixed(2)}`;
      const resultText = `= [${result.x.toFixed(3)}, ${result.y.toFixed(3)}] (magnitude = 1.0)`;
      this.displayResult(formula, calculation, resultText);
    });
  }

  performPerpendicular(vectorNum) {
    // Clear parallelogram and angle arc from previous operations
    this.parallelogramState = null;
    this.angleArcState = null;

    let vector, result;

    if (vectorNum === 1 && this.vector1) {
      vector = this.vector1;
      result = vector.perpendicular();
      result.label = 'v₁⊥';
      result.color = this.config.colors.vector1;
    } else if (vectorNum === 2 && this.vector2) {
      vector = this.vector2;
      result = vector.perpendicular();
      result.label = 'v₂⊥';
      result.color = this.config.colors.vector2;
    } else {
      return;
    }

    // Log operation
    logAction(`Perpendicular operation: v${vectorNum} (${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}). Result: (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`);

    this.animateToResult(result, () => {
      const formula = `v${vectorNum}⊥ = [-y, x] (90° rotation)`;
      const calculation = `= [${-vector.y.toFixed(1)}, ${vector.x.toFixed(1)}]`;
      const resultText = `= [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;
      this.displayResult(formula, resultText);
    });
  }

  performReflect(vectorNum) {
    // Clear parallelogram and angle arc from previous operations
    this.parallelogramState = null;
    this.angleArcState = null;

    let vector, result, reflectionType, axis, formula;

    // Get the reflection type from dropdown
    const selectId = `reflect-type-v${vectorNum}`;
    reflectionType = document.getElementById(selectId).value;

    if (vectorNum === 1 && this.vector1) {
      vector = this.vector1;
    } else if (vectorNum === 2 && this.vector2) {
      vector = this.vector2;
    } else {
      return;
    }

    // Perform the appropriate reflection
    switch(reflectionType) {
      case 'x-axis':
        result = vector.reflectX();
        result.label = `v${vectorNum}_reflₓ`;
        axis = 'X-axis';
        formula = `Reflect v${vectorNum} across X-axis: (x, y) → (x, -y)`;
        break;
      case 'y-axis':
        result = vector.reflectY();
        result.label = `v${vectorNum}_refly`;
        axis = 'Y-axis';
        formula = `Reflect v${vectorNum} across Y-axis: (x, y) → (-x, y)`;
        break;
      case 'diagonal':
        result = vector.reflectDiagonal();
        result.label = `v${vectorNum}_reflᵈ`;
        axis = 'diagonal (y=x)';
        formula = `Reflect v${vectorNum} across y=x: (x, y) → (y, x)`;
        break;
      default:
        return;
    }

    // Log operation
    logAction(`Reflect ${axis}: v${vectorNum} (${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}). Result: (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`);

    this.animateToResult(result, () => {
      const calculation = `[${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}] → [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;
      this.displayResult(formula, calculation);
    });
  }

  updateLinearComboButton() {
    const scalarA = parseFloat(document.getElementById('lc-scalar-a').value) || 0;
    const scalarB = parseFloat(document.getElementById('lc-scalar-b').value) || 0;
    const button = document.getElementById('op-linear-combo');

    // Format the button text with proper signs
    const aText = scalarA === 1 ? '' : scalarA === -1 ? '-' : scalarA;
    const bText = scalarB >= 0 ? ` + ${scalarB === 1 ? '' : scalarB}` : ` - ${Math.abs(scalarB) === 1 ? '' : Math.abs(scalarB)}`;

    button.textContent = `${aText}v₁${bText}v₂`;
  }

  performLinearCombination() {
    if (!this.vector1 || !this.vector2) return;

    // Get scalar values from inputs
    const scalarA = parseFloat(document.getElementById('lc-scalar-a').value);
    const scalarB = parseFloat(document.getElementById('lc-scalar-b').value);

    if (isNaN(scalarA) || isNaN(scalarB)) return;

    // Clear parallelogram and angle arc from previous operations
    this.parallelogramState = null;
    this.angleArcState = null;

    // Calculate scaled vectors with proper labels
    const scaledV1 = this.vector1.scale(scalarA);
    scaledV1.label = `${scalarA}v₁`;
    scaledV1.color = this.config.parallelogram.v1CopyColor; // Use parallelogram v1 color for consistency

    const scaledV2 = this.vector2.scale(scalarB);
    scaledV2.label = `${scalarB}v₂`;
    scaledV2.color = this.config.parallelogram.v2CopyColor; // Use parallelogram v2 color for consistency

    // Calculate result: av₁ + bv₂
    const result = new Vector(
      scaledV1.x + scaledV2.x,
      scaledV1.y + scaledV2.y,
      this.config.colors.result,
      `${scalarA}v₁ + ${scalarB}v₂`
    );

    // Log operation
    logAction(`Linear combination: ${scalarA}v1 + ${scalarB}v2. Result: (${result.x.toFixed(2)}, ${result.y.toFixed(2)})`);

    // Animate with parallelogram showing scaled vectors
    // Use scaled vectors for parallelogram visualization
    // Pass linear combination data to animateParallelogram for rendering
    this.animateParallelogram(result, scaledV1, scaledV2, null, () => {
      const formula = `${scalarA}v₁ + ${scalarB}v₂`;
      const calculation = `= ${scalarA}[${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}] + ${scalarB}[${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}]`;
      const resultText = `= [${result.x.toFixed(2)}, ${result.y.toFixed(2)}]`;
      this.displayResult(formula, calculation, resultText);
    }, {
      scaledV1: scaledV1,
      scaledV2: scaledV2,
      scalarA: scalarA,
      scalarB: scalarB
    });
  }

  // ============================================================================
  // ANIMATION
  // ============================================================================

  animateToResult(targetVector, onComplete) {
    this.isAnimating = true;
    this.animationStartTime = performance.now();
    this.animationFrom = this.resultVector ? this.resultVector.clone() : new Vector(0, 0, targetVector.color, '');
    this.animationTo = targetVector;

    const animate = (currentTime) => {
      const elapsed = currentTime - this.animationStartTime;
      const progress = Math.min(elapsed / this.config.animationDuration, 1);

      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      this.resultVector = new Vector(
        this.animationFrom.x + (this.animationTo.x - this.animationFrom.x) * eased,
        this.animationFrom.y + (this.animationTo.y - this.animationFrom.y) * eased,
        this.animationTo.color,
        this.animationTo.label,
        this.animationTo.lineWidth
      );

      this.render();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.resultVector = this.animationTo;
        this.render();
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
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

    const totalDuration = this.config.parallelogram.staggerDelay + this.config.parallelogram.translateDuration;

    const animate = (currentTime) => {
      const elapsed = currentTime - this.parallelogramState.startTime;

      // Phase 1: Fade in edges (0-200ms)
      if (elapsed < this.config.parallelogram.edgeFadeInDuration) {
        this.parallelogramState.edgeOpacity = elapsed / this.config.parallelogram.edgeFadeInDuration;
      } else {
        this.parallelogramState.edgeOpacity = 1;
      }

      // Phase 2: Draw translated v2 from v1's tip (0-400ms)
      const v2Progress = Math.min(elapsed / this.config.parallelogram.translateDuration, 1);
      // Cubic easing (ease-out)
      this.parallelogramState.v2Progress = 1 - Math.pow(1 - v2Progress, 3);

      // Phase 3: Draw translated v1 from v2's tip (200-600ms, overlaps phase 2)
      const v1StartTime = this.config.parallelogram.staggerDelay;
      const v1Elapsed = Math.max(0, elapsed - v1StartTime);
      const v1Progress = Math.min(v1Elapsed / this.config.parallelogram.translateDuration, 1);
      // Cubic easing (ease-out)
      this.parallelogramState.v1Progress = 1 - Math.pow(1 - v1Progress, 3);

      this.render();

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
  // UI UPDATES
  // ============================================================================

  /**
   * Check if an operation group should be visible based on configuration
   * @param {string} groupName - Name of the operation group
   * @returns {boolean} - True if the group should be shown
   */
  shouldShowOperationGroup(groupName) {
    // First check if the operation group is enabled in configuration
    if (this.config.operationGroups[groupName] === false) {
      return false;
    }

    // Hide operations that require 2 vectors when maxVectors < 2
    const twoVectorOperations = ['addition', 'dotProduct', 'projectionAngle'];
    if (twoVectorOperations.includes(groupName) && this.config.maxVectors < 2) {
      return false;
    }

    return true;
  }

  updateUI() {
    // Update Vector 1
    if (this.vector1) {
      document.getElementById('v1-coords').textContent =
        this.vector1.formatCoordinates(this.coordinateMode);
      document.getElementById('v1-magnitude').textContent =
        this.vector1.magnitude().toFixed(2);
    } else {
      document.getElementById('v1-coords').textContent = 'Not created';
      document.getElementById('v1-magnitude').textContent = '—';
    }

    // Update Vector 2
    if (this.vector2) {
      document.getElementById('v2-coords').textContent =
        this.vector2.formatCoordinates(this.coordinateMode);
      document.getElementById('v2-magnitude').textContent =
        this.vector2.magnitude().toFixed(2);
    } else {
      document.getElementById('v2-coords').textContent = 'Not created';
      document.getElementById('v2-magnitude').textContent = '—';
    }

    // Enable/disable operation buttons
    const bothExist = this.vector1 && this.vector2;
    document.getElementById('op-add').disabled = !bothExist;
    document.getElementById('op-subtract').disabled = !bothExist;
    document.getElementById('op-dot').disabled = !bothExist;

    // Enable/disable new operation buttons
    document.getElementById('op-project').disabled = !bothExist;
    document.getElementById('op-angle').disabled = !bothExist;

    // Normalize and perpendicular dropdown management
    const v1Exists = this.vector1;
    const v2Exists = this.vector2;
    const anyVectorExists = v1Exists || v2Exists;

    // Enable/disable scale button and manage dropdown
    document.getElementById('op-scale').disabled = !anyVectorExists;
    const scaleSelect = document.getElementById('scale-vector-select');
    scaleSelect.querySelector('option[value="v1"]').disabled = !v1Exists;
    scaleSelect.querySelector('option[value="v2"]').disabled = !v2Exists;

    // Auto-select available vector
    if (v1Exists && !v2Exists) {
      scaleSelect.value = 'v1';
    } else if (!v1Exists && v2Exists) {
      scaleSelect.value = 'v2';
    }

    // Enable/disable normalize button and manage dropdown
    document.getElementById('op-normalize').disabled = !anyVectorExists;
    const normalizeSelect = document.getElementById('normalize-vector-select');
    normalizeSelect.querySelector('option[value="v1"]').disabled = !v1Exists;
    normalizeSelect.querySelector('option[value="v2"]').disabled = !v2Exists;

    // Auto-select available vector
    if (v1Exists && !v2Exists) {
      normalizeSelect.value = 'v1';
    } else if (!v1Exists && v2Exists) {
      normalizeSelect.value = 'v2';
    }

    // Enable/disable perpendicular button and manage dropdown
    document.getElementById('op-perpendicular').disabled = !anyVectorExists;
    const perpSelect = document.getElementById('perpendicular-vector-select');
    perpSelect.querySelector('option[value="v1"]').disabled = !v1Exists;
    perpSelect.querySelector('option[value="v2"]').disabled = !v2Exists;

    // Auto-select available vector
    if (v1Exists && !v2Exists) {
      perpSelect.value = 'v1';
    } else if (!v1Exists && v2Exists) {
      perpSelect.value = 'v2';
    }

    // Enable/disable reflection buttons
    document.getElementById('op-reflect-v1').disabled = !this.vector1;
    document.getElementById('op-reflect-v2').disabled = !this.vector2;

    // Enable/disable linear combination button
    document.getElementById('op-linear-combo').disabled = !bothExist;

    // Update linear combination button text
    this.updateLinearComboButton();

    // Show/hide operation groups based on configuration
    document.querySelectorAll('[data-operation-group]').forEach(element => {
      const groupName = element.getAttribute('data-operation-group');
      if (this.shouldShowOperationGroup(groupName)) {
        element.style.display = '';
      } else {
        element.style.display = 'none';
      }
    });

    // Show/hide vector panels based on maxVectors configuration
    const vector2Control = document.getElementById('vector2-control');
    if (vector2Control) {
      if (this.config.maxVectors >= 2) {
        vector2Control.style.display = '';
      } else {
        vector2Control.style.display = 'none';
      }
    }
  }

  displayResult(...lines) {
    const resultsDiv = document.getElementById('vector-results');
    if (resultsDiv) {
      resultsDiv.innerHTML = lines.map(line =>
        `<p class="formula">${line}</p>`
      ).join('');
    }
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
   * Clean up resources when mode is destroyed
   */
  destroy() {
    // Remove event listeners would require storing references
    // For now, just clear state
    this.vector1 = null;
    this.vector2 = null;
    this.resultVector = null;
    this.parallelogramState = null;
    this.angleArcState = null;
  }
}

