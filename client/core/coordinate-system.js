/**
 * CoordinateSystem Class
 * Handles canvas setup, coordinate transformations, and grid/axes rendering
 */

class CoordinateSystem {
  constructor(canvas, colors, styleConstants, skipAutoSetup = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.colors = colors || {};
    this.styleConstants = styleConstants; // Styling constants (gridSize, lineWidths, etc.)

    // Canvas dimensions (set by setupCanvas)
    this.width = 0;
    this.height = 0;
    this.centerX = 0;
    this.centerY = 0;

    if (!skipAutoSetup) {
      this.setupCanvas();
    }
  }

  setupCanvas() {
    const resizeCanvas = () => {
      const container = this.canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;

      this.canvas.width = container.clientWidth * dpr;
      this.canvas.height = container.clientHeight * dpr;

      this.canvas.style.width = container.clientWidth + 'px';
      this.canvas.style.height = container.clientHeight + 'px';

      this.ctx.scale(dpr, dpr);

      this.width = container.clientWidth;
      this.height = container.clientHeight;
      this.centerX = this.width / 2;
      this.centerY = this.height / 2;

      // Trigger external render callback if registered
      if (this.onResize) {
        this.onResize();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  /**
   * Register callback to be called when canvas resizes
   * @param {function} callback - Function to call on resize
   */
  setResizeCallback(callback) {
    this.onResize = callback;
  }

  /**
   * Update color cache (for theme changes)
   * @param {object} colors - Color object
   */
  updateColors(colors) {
    this.colors = colors;
  }

  // ============================================================================
  // COORDINATE TRANSFORMATIONS
  // ============================================================================

  /**
   * Convert screen coordinates to mathematical coordinates
   * @param {number} screenX - X coordinate in screen space
   * @param {number} screenY - Y coordinate in screen space
   * @returns {object} - {x, y} in mathematical coordinates
   */
  screenToMath(screenX, screenY) {
    const mathX = (screenX - this.centerX) / this.styleConstants.gridSize;
    const mathY = -(screenY - this.centerY) / this.styleConstants.gridSize;
    return { x: mathX, y: mathY };
  }

  /**
   * Convert mathematical coordinates to screen coordinates
   * @param {number} mathX - X coordinate in mathematical space
   * @param {number} mathY - Y coordinate in mathematical space
   * @returns {object} - {x, y} in screen coordinates
   */
  mathToScreen(mathX, mathY) {
    const screenX = this.centerX + mathX * this.styleConstants.gridSize;
    const screenY = this.centerY - mathY * this.styleConstants.gridSize;
    return { x: screenX, y: screenY };
  }

  /**
   * Snap a value to the nearest 0.5 increment
   * @param {number} value - Value to snap
   * @returns {number} - Snapped value
   */
  snapToGrid(value) {
    return Math.round(value * 2) / 2; // Snap to 0.5 increments
  }

  // ============================================================================
  // RENDERING
  // ============================================================================

  /**
   * Clear the entire canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Draw the background grid
   */
  drawGrid() {
    this.ctx.strokeStyle = this.colors.grid || this.styleConstants.colors.grid;
    this.ctx.lineWidth = this.styleConstants.gridLineWidth;

    // Vertical lines
    for (let x = this.centerX % this.styleConstants.gridSize; x < this.width; x += this.styleConstants.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = this.centerY % this.styleConstants.gridSize; y < this.height; y += this.styleConstants.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw the X and Y axes with labels
   */
  drawAxes() {
    this.ctx.strokeStyle = this.colors.axis || this.styleConstants.colors.axis;
    this.ctx.lineWidth = this.styleConstants.axisLineWidth;
    this.ctx.fillStyle = this.colors.text || this.styleConstants.colors.text;
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // X-axis
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.centerY);
    this.ctx.lineTo(this.width, this.centerY);
    this.ctx.stroke();

    // Y-axis
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX, 0);
    this.ctx.lineTo(this.centerX, this.height);
    this.ctx.stroke();

    // Draw tick marks and labels
    const maxUnits = Math.ceil(Math.max(this.width, this.height) / this.styleConstants.gridSize / 2);

    for (let i = -maxUnits; i <= maxUnits; i++) {
      if (i === 0) continue;

      const screenX = this.centerX + i * this.styleConstants.gridSize;
      const screenY = this.centerY - i * this.styleConstants.gridSize;

      // X-axis ticks
      if (screenX >= 0 && screenX <= this.width) {
        this.ctx.beginPath();
        this.ctx.moveTo(screenX, this.centerY - 5);
        this.ctx.lineTo(screenX, this.centerY + 5);
        this.ctx.stroke();
        this.ctx.fillText(i.toString(), screenX, this.centerY + 15);
      }

      // Y-axis ticks
      if (screenY >= 0 && screenY <= this.height) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX - 5, screenY);
        this.ctx.lineTo(this.centerX + 5, screenY);
        this.ctx.stroke();
        this.ctx.fillText(i.toString(), this.centerX - 15, screenY);
      }
    }

    // Draw origin label
    this.ctx.fillText('0', this.centerX - 15, this.centerY + 15);

    // Draw axis labels
    this.ctx.font = 'bold 14px Arial';
    this.ctx.fillText('x', this.width - 20, this.centerY + 20);
    this.ctx.fillText('y', this.centerX + 20, 20);
  }

  /**
   * Calculate smart label position based on vector angle to avoid collisions
   * @param {Vector} vector - The vector to calculate label position for
   * @param {number} baseOffset - Base offset distance in pixels (default: 20)
   * @returns {{x: number, y: number}} - Screen coordinates for label position
   */
  computeLabelPosition(vector, baseOffset = 20) {
    const end = this.mathToScreen(vector.x, vector.y);
    const magnitude = vector.magnitude();

    // For very short vectors (normalized vectors have magnitude ~1), increase offset
    const offsetMultiplier = magnitude < 1.5 ? 1.8 : 1.0;
    const offset = baseOffset * offsetMultiplier;

    // Calculate vector angle
    const angle = Math.atan2(vector.y, vector.x);

    // Position label perpendicular to vector (90 degrees offset)
    // We add π/2 to rotate the offset perpendicular to the vector
    const labelAngle = angle + Math.PI / 2;

    // Calculate label position
    // For vectors pointing right (angle near 0), label goes above
    // For vectors pointing up (angle near π/2), label goes left
    // For vectors pointing left (angle near π), label goes below
    // For vectors pointing down (angle near -π/2), label goes right
    let labelX = end.x + offset * Math.cos(labelAngle);
    let labelY = end.y - offset * Math.sin(labelAngle);

    // Adjust to keep labels above/right for better readability
    // If label would be below or left of endpoint, flip it to other side
    if (labelY > end.y + 5) {
      // Label is too far below, flip to above
      labelX = end.x - offset * Math.cos(labelAngle);
      labelY = end.y + offset * Math.sin(labelAngle);
    }

    return { x: labelX, y: labelY };
  }

  /**
   * Draw a vector from the origin
   * @param {Vector} vector - The vector to draw
   * @param {object} styleConstants - Style constants object (gridSize, arrowHeadSize, vectorLineWidth, hitRadius)
   * @param {object} colors - Color object (hover, hoverHighlight)
   * @param {boolean} isDashed - Whether to draw with dashed line
   * @param {number} opacity - Opacity (0-1)
   * @param {boolean} isHovered - Whether the vector is hovered
   * @param {number} lineWidthOverride - Override line width
   */
  drawVector(vector, styleConstants, colors, isDashed = false, opacity = 1, isHovered = false, lineWidthOverride = null, subscript = null) {
    const start = this.mathToScreen(0, 0);
    const end = this.mathToScreen(vector.x, vector.y);

    this.ctx.save();
    this.ctx.globalAlpha = opacity;

    // Use hover color if hovered, otherwise use vector color
    const drawColor = isHovered && colors ? colors.hover : vector.color;
    this.ctx.strokeStyle = drawColor;
    this.ctx.fillStyle = drawColor;

    // Use vector's custom lineWidth if available, otherwise use override or default
    const lineWidth = vector.lineWidth || lineWidthOverride || (isHovered ? styleConstants.vectorLineWidth + 1 : styleConstants.vectorLineWidth);
    this.ctx.lineWidth = lineWidth;

    if (isDashed) {
      this.ctx.setLineDash([5, 5]);
    }

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headlen = styleConstants.arrowHeadSize;

    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headlen * Math.cos(angle - Math.PI / 6),
      end.y - headlen * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      end.x - headlen * Math.cos(angle + Math.PI / 6),
      end.y - headlen * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();

    // Draw hover highlight circle around endpoint
    if (isHovered && colors) {
      this.ctx.globalAlpha = 0.3 * opacity;
      this.ctx.strokeStyle = colors.hoverHighlight;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(end.x, end.y, styleConstants.hitRadius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Fill circle for better visibility
      this.ctx.globalAlpha = 0.1 * opacity;
      this.ctx.fillStyle = colors.hoverHighlight;
      this.ctx.fill();

      this.ctx.globalAlpha = opacity; // Reset alpha
    }

    // Draw label using smart positioning
    if (vector.label) {
      this.ctx.font = 'bold 16px serif';
      this.ctx.fillStyle = drawColor;
      const labelPos = this.computeLabelPosition(vector);

      // Draw base label
      this.ctx.fillText(vector.label, labelPos.x, labelPos.y);

      // Draw subscript if provided
      if (subscript) {
        // Measure base label width to position subscript
        const baseTextMetrics = this.ctx.measureText(vector.label);
        const subscriptFontSize = 11; // ~70% of base 16px font
        this.ctx.font = `bold ${subscriptFontSize}px serif`;
        this.ctx.fillText(subscript, labelPos.x + baseTextMetrics.width + 1, labelPos.y + 5);
      }
    }

    this.ctx.restore();
  }

  /**
   * Draw a vector translated from a non-origin starting point
   * Used for visualizing parallelogram law in vector addition/subtraction
   *
   * @param {Vector} vector - The vector to draw
   * @param {Object} startPoint - Starting point in math coordinates {x, y}
   * @param {object} styleConstants - Style constants object (gridSize, arrowHeadSize, parallelogram settings)
   * @param {number} progress - Animation progress 0-1 (1 = fully drawn)
   * @param {string} color - Color override for the vector
   */
  drawTranslatedVector(vector, startPoint, styleConstants, progress = 1, color = null) {
    // Convert start point from math to screen coordinates
    const start = this.mathToScreen(startPoint.x, startPoint.y);

    // Calculate endpoint: startPoint + (vector * progress)
    const endMathX = startPoint.x + (vector.x * progress);
    const endMathY = startPoint.y + (vector.y * progress);
    const end = this.mathToScreen(endMathX, endMathY);

    // If progress is near zero, don't draw anything
    if (progress < 0.01) return;

    this.ctx.save();
    this.ctx.globalAlpha = styleConstants.parallelogram.opacity;

    const drawColor = color || vector.color;
    this.ctx.strokeStyle = drawColor;
    this.ctx.fillStyle = drawColor;
    this.ctx.lineWidth = styleConstants.parallelogram.lineWidth;
    this.ctx.setLineDash(styleConstants.parallelogram.dashPattern);

    // Draw line from translated start to translated end
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    // Draw arrowhead at end (only if progress is significant)
    if (progress > 0.3) {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headlen = styleConstants.arrowHeadSize;

      this.ctx.beginPath();
      this.ctx.moveTo(end.x, end.y);
      this.ctx.lineTo(
        end.x - headlen * Math.cos(angle - Math.PI / 6),
        end.y - headlen * Math.sin(angle - Math.PI / 6)
      );
      this.ctx.lineTo(
        end.x - headlen * Math.cos(angle + Math.PI / 6),
        end.y - headlen * Math.sin(angle + Math.PI / 6)
      );
      this.ctx.closePath();
      this.ctx.fill();
    }

    // No label for parallelogram edges (keeps canvas clean)

    this.ctx.restore();
  }
}
