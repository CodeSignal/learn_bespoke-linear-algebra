/**
 * VectorCanvas Class
 * Handles canvas rendering and hit testing for vector mode
 * Pure rendering logic with no DOM queries or side effects
 */

class VectorCanvas {
  constructor(canvas, coordSystem, config, colors) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.coordSystem = coordSystem;
    this.config = config;
    this.colors = colors;
  }

  /**
   * Update dimensions from CoordinateSystem
   */
  updateDimensions() {
    this.width = this.coordSystem.width;
    this.height = this.coordSystem.height;
    this.centerX = this.coordSystem.centerX;
    this.centerY = this.coordSystem.centerY;
  }

  /**
   * Update colors cache
   * @param {Object} colors - Color object
   */
  updateColors(colors) {
    this.colors = colors;
  }

  // ============================================================================
  // COORDINATE TRANSFORMATIONS
  // ============================================================================

  screenToMath(screenX, screenY) {
    return this.coordSystem.screenToMath(screenX, screenY);
  }

  mathToScreen(mathX, mathY) {
    return this.coordSystem.mathToScreen(mathX, mathY);
  }

  snapToGrid(value) {
    return Math.round(value * 2) / 2; // Snap to 0.5 increments
  }

  // ============================================================================
  // HIT TESTING
  // ============================================================================

  /**
   * Check if mouse is near vector endpoint (for editing)
   * @param {number} mouseScreenX - Mouse X position in screen coordinates
   * @param {number} mouseScreenY - Mouse Y position in screen coordinates
   * @param {Vector|null} vector1 - First vector or null
   * @param {Vector|null} vector2 - Second vector or null
   * @returns {string|null} 'vector1', 'vector2', or null
   */
  checkEndpointHit(mouseScreenX, mouseScreenY, vector1, vector2) {
    const checkVector = (vector) => {
      if (!vector) return false;
      const endpoint = this.mathToScreen(vector.x, vector.y);
      const dx = mouseScreenX - endpoint.x;
      const dy = mouseScreenY - endpoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= this.config.hitRadius;
    };

    // Check vector1 first, then vector2
    if (vector1 && checkVector(vector1)) {
      return 'vector1';
    }
    if (vector2 && checkVector(vector2)) {
      return 'vector2';
    }
    return null;
  }

  // ============================================================================
  // RENDERING
  // ============================================================================

  /**
   * Render the canvas with current vector state
   * @param {Object} state - Rendering state object
   * @param {Vector|null} state.vector1 - First vector
   * @param {Vector|null} state.vector2 - Second vector
   * @param {Vector|null} state.resultVector - Result vector
   * @param {Vector|null} state.drawingVector - Vector being drawn
   * @param {boolean} state.isDrawing - Whether currently drawing
   * @param {string|null} state.hoveredVector - 'vector1', 'vector2', or null
   * @param {Object|null} state.angleArcState - Angle arc visualization state
   * @param {Object|null} state.parallelogramState - Parallelogram animation state
   */
  render(state) {
    // Update dimensions from CoordinateSystem (in case of resize)
    this.updateDimensions();

    // Use CoordinateSystem's clear method
    this.coordSystem.clear();

    // Use CoordinateSystem for grid and axes
    this.coordSystem.drawGrid();
    this.coordSystem.drawAxes();

    // Draw vectors with hover state using CoordinateSystem
    if (state.vector1) {
      this.coordSystem.drawVector(
        state.vector1,
        this.config,
        this.colors,
        false,
        1,
        state.hoveredVector === 'vector1'
      );
    }
    if (state.vector2) {
      this.coordSystem.drawVector(
        state.vector2,
        this.config,
        this.colors,
        false,
        1,
        state.hoveredVector === 'vector2'
      );
    }

    // Draw angle arc if angle visualization is active
    if (state.angleArcState) {
      this.drawAngleArc(
        state.angleArcState.vector1,
        state.angleArcState.vector2,
        state.angleArcState.angleRadians,
        state.angleArcState.angleDegrees
      );
    }

    // Draw negated vector for subtraction (dashed style, similar to parallelogram edges)
    if (state.parallelogramState && state.parallelogramState.negatedVector2) {
      this.coordSystem.drawVector(
        state.parallelogramState.negatedVector2,
        this.config,
        this.colors,
        true,  // dashed
        0.5,   // 50% opacity like parallelogram edges
        false  // no hover
      );
    }

    // Draw scaled vectors from origin for linear combination visualization
    if (state.parallelogramState && state.parallelogramState.isLinearCombination) {
      const scaledV1 = state.parallelogramState.scaledV1;
      const scaledV2 = state.parallelogramState.scaledV2;

      // Calculate opacity with fade-in effect during animation
      const baseOpacity = this.config.parallelogram.opacity;
      const currentOpacity = baseOpacity * state.parallelogramState.edgeOpacity;

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
    if (state.parallelogramState && state.parallelogramState.useVector1 && state.parallelogramState.useVector2) {
      // Apply edge opacity for fade-in effect
      const savedOpacity = this.config.parallelogram.opacity;
      this.config.parallelogram.opacity = savedOpacity * state.parallelogramState.edgeOpacity;

      const v1 = state.parallelogramState.useVector1;
      const v2 = state.parallelogramState.useVector2;

      // Draw v2 translated to v1's tip (with progress for animation)
      this.coordSystem.drawTranslatedVector(
        v2,
        { x: v1.x, y: v1.y },
        this.config,
        state.parallelogramState.v2Progress,
        this.config.parallelogram.v2CopyColor
      );

      // Draw v1 translated to v2's tip (with progress for animation)
      this.coordSystem.drawTranslatedVector(
        v1,
        { x: v2.x, y: v2.y },
        this.config,
        state.parallelogramState.v1Progress,
        this.config.parallelogram.v1CopyColor
      );

      // Restore original opacity
      this.config.parallelogram.opacity = savedOpacity;
    }

    // Draw result vector
    if (state.resultVector) {
      this.coordSystem.drawVector(
        state.resultVector,
        this.config,
        this.colors,
        true,
        1,
        false
      );
    }

    // Draw vector being created
    if (state.isDrawing && state.drawingVector) {
      this.coordSystem.drawVector(
        state.drawingVector,
        this.config,
        this.colors,
        false,
        0.5,
        false
      );
    }
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
}

