/**
 * Interactive Linear Algebra Educational Experience
 * A visual tool for learning vector operations
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = {
  gridSize: 40,           // pixels per unit
  arrowHeadSize: 12,      // pixels
  vectorLineWidth: 3,
  gridLineWidth: 1,
  axisLineWidth: 2,
  hitRadius: 15,          // pixels for endpoint hit detection
  colors: {
    vector1: '#ef4444',   // red
    vector2: '#3b82f6',   // blue
    result: '#10b981',    // green
    grid: '#d1d5db',      // lighter gray for better contrast in both modes
    axis: '#9ca3af',      // medium gray
    text: '#6b7280',      // medium gray for labels
    hover: '#fbbf24',     // amber - lighter for visibility
    hoverHighlight: '#f59e0b',  // darker amber for hover ring
  },
  animationDuration: 800, // milliseconds
};

// ============================================================================
// VECTOR CLASS
// ============================================================================

class Vector {
  constructor(x, y, color, label) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.label = label;
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  angle() {
    return Math.atan2(this.y, this.x);
  }

  angleDegrees() {
    return this.angle() * (180 / Math.PI);
  }

  add(other) {
    return new Vector(
      this.x + other.x,
      this.y + other.y,
      CONFIG.colors.result,
      'result'
    );
  }

  subtract(other) {
    return new Vector(
      this.x - other.x,
      this.y - other.y,
      CONFIG.colors.result,
      'result'
    );
  }

  scale(scalar) {
    return new Vector(
      this.x * scalar,
      this.y * scalar,
      CONFIG.colors.result,
      'result'
    );
  }

  dot(other) {
    return this.x * other.x + this.y * other.y;
  }

  // Project this vector onto another vector
  projectOnto(other) {
    const dotProduct = this.dot(other);
    const otherMagnitudeSquared = other.x * other.x + other.y * other.y;

    if (otherMagnitudeSquared === 0) {
      return new Vector(0, 0, CONFIG.colors.result, 'proj');
    }

    const scalar = dotProduct / otherMagnitudeSquared;
    return new Vector(
      scalar * other.x,
      scalar * other.y,
      CONFIG.colors.result,
      'proj'
    );
  }

  // Calculate angle between this vector and another (in radians)
  angleBetween(other) {
    const dotProduct = this.dot(other);
    const mag1 = this.magnitude();
    const mag2 = other.magnitude();

    if (mag1 === 0 || mag2 === 0) return 0;

    // Clamp to [-1, 1] to avoid floating point errors with acos
    const cosAngle = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
    return Math.acos(cosAngle);
  }

  // Calculate angle between this vector and another (in degrees)
  angleBetweenDegrees(other) {
    return this.angleBetween(other) * (180 / Math.PI);
  }

  // Return a normalized (unit) vector
  normalize() {
    const mag = this.magnitude();
    if (mag === 0) {
      return new Vector(0, 0, CONFIG.colors.result, 'unit');
    }
    return new Vector(
      this.x / mag,
      this.y / mag,
      CONFIG.colors.result,
      'û'
    );
  }

  // Return a perpendicular vector (90° counterclockwise rotation)
  perpendicular() {
    return new Vector(
      -this.y,
      this.x,
      CONFIG.colors.result,
      'perp'
    );
  }

  clone() {
    return new Vector(this.x, this.y, this.color, this.label);
  }
}

// ============================================================================
// CANVAS & COORDINATE SYSTEM
// ============================================================================

class LinearAlgebraApp {
  constructor() {
    this.canvas = document.getElementById('grid-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Vectors
    this.vector1 = null;
    this.vector2 = null;
    this.resultVector = null;

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

    // Initialize
    this.setupCanvas();
    this.setupEventListeners();
    this.render();
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

      this.render();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  setupEventListeners() {
    // Canvas mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));

    // Sidebar buttons
    document.getElementById('clear-all').addEventListener('click', () => this.clearAll());

    document.getElementById('op-add').addEventListener('click', () => this.performAdd());
    document.getElementById('op-subtract').addEventListener('click', () => this.performSubtract());
    document.getElementById('op-scale-v1').addEventListener('click', () => this.performScale(1));
    document.getElementById('op-scale-v2').addEventListener('click', () => this.performScale(2));
    document.getElementById('op-dot').addEventListener('click', () => this.performDot());

    // New operation buttons
    document.getElementById('op-project').addEventListener('click', () => this.performProject());
    document.getElementById('op-angle').addEventListener('click', () => this.performAngleBetween());
    document.getElementById('op-normalize-v1').addEventListener('click', () => this.performNormalize(1));
    document.getElementById('op-normalize-v2').addEventListener('click', () => this.performNormalize(2));
    document.getElementById('op-perp-v1').addEventListener('click', () => this.performPerpendicular(1));
    document.getElementById('op-perp-v2').addEventListener('click', () => this.performPerpendicular(2));
  }

  // ============================================================================
  // COORDINATE TRANSFORMATIONS
  // ============================================================================

  screenToMath(screenX, screenY) {
    const mathX = (screenX - this.centerX) / CONFIG.gridSize;
    const mathY = -(screenY - this.centerY) / CONFIG.gridSize;
    return { x: mathX, y: mathY };
  }

  mathToScreen(mathX, mathY) {
    const screenX = this.centerX + mathX * CONFIG.gridSize;
    const screenY = this.centerY - mathY * CONFIG.gridSize;
    return { x: screenX, y: screenY };
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
      return distance <= CONFIG.hitRadius;
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
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawGrid();
    this.drawAxes();

    // Draw vectors with hover state
    if (this.vector1) this.drawVector(this.vector1, false, 1, this.hoveredVector === 'vector1');
    if (this.vector2) this.drawVector(this.vector2, false, 1, this.hoveredVector === 'vector2');
    if (this.resultVector) this.drawVector(this.resultVector, true, 1, false);

    // Draw vector being created
    if (this.isDrawing && this.drawingVector) {
      this.drawVector(this.drawingVector, false, 0.5, false);
    }

    this.updateUI();
  }

  drawGrid() {
    this.ctx.strokeStyle = CONFIG.colors.grid;
    this.ctx.lineWidth = CONFIG.gridLineWidth;

    // Vertical lines
    for (let x = this.centerX % CONFIG.gridSize; x < this.width; x += CONFIG.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = this.centerY % CONFIG.gridSize; y < this.height; y += CONFIG.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  drawAxes() {
    this.ctx.strokeStyle = CONFIG.colors.axis;
    this.ctx.lineWidth = CONFIG.axisLineWidth;
    this.ctx.fillStyle = CONFIG.colors.text;
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
    const maxUnits = Math.ceil(Math.max(this.width, this.height) / CONFIG.gridSize / 2);

    for (let i = -maxUnits; i <= maxUnits; i++) {
      if (i === 0) continue;

      const screenX = this.centerX + i * CONFIG.gridSize;
      const screenY = this.centerY - i * CONFIG.gridSize;

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

  drawVector(vector, isDashed = false, opacity = 1, isHovered = false) {
    const start = this.mathToScreen(0, 0);
    const end = this.mathToScreen(vector.x, vector.y);

    this.ctx.save();
    this.ctx.globalAlpha = opacity;

    // Use hover color if hovered, otherwise use vector color
    const drawColor = isHovered ? CONFIG.colors.hover : vector.color;
    this.ctx.strokeStyle = drawColor;
    this.ctx.fillStyle = drawColor;
    this.ctx.lineWidth = isHovered ? CONFIG.vectorLineWidth + 1 : CONFIG.vectorLineWidth;

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
    const headlen = CONFIG.arrowHeadSize;

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
    if (isHovered) {
      this.ctx.globalAlpha = 0.3 * opacity;
      this.ctx.strokeStyle = CONFIG.colors.hoverHighlight;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(end.x, end.y, CONFIG.hitRadius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Fill circle for better visibility
      this.ctx.globalAlpha = 0.1 * opacity;
      this.ctx.fillStyle = CONFIG.colors.hoverHighlight;
      this.ctx.fill();

      this.ctx.globalAlpha = opacity; // Reset alpha
    }

    // Draw label
    if (vector.label) {
      this.ctx.font = 'bold 16px serif';
      this.ctx.fillStyle = drawColor;
      const labelPos = {
        x: end.x + 15,
        y: end.y - 15
      };
      this.ctx.fillText(vector.label, labelPos.x, labelPos.y);
    }

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
      this.drawingVector = new Vector(0, 0, CONFIG.colors.vector1, 'v₁');
    } else if (!this.vector2) {
      this.isDrawing = true;
      this.drawingVector = new Vector(0, 0, CONFIG.colors.vector2, 'v₂');
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

      // Clear result vector when editing
      this.resultVector = null;
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
      } else if (!this.vector2) {
        this.vector2 = this.drawingVector;
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
    this.render();
  }

  performAdd() {
    if (!this.vector1 || !this.vector2) return;

    const result = this.vector1.add(this.vector2);
    result.label = 'v₁ + v₂';

    this.animateToResult(result, () => {
      const formula = `v₁ + v₂ = [${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}] + [${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}]`;
      const resultText = `= [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;
      this.displayResult(formula, resultText);
    });
  }

  performSubtract() {
    if (!this.vector1 || !this.vector2) return;

    const result = this.vector1.subtract(this.vector2);
    result.label = 'v₁ - v₂';

    this.animateToResult(result, () => {
      const formula = `v₁ - v₂ = [${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}] - [${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}]`;
      const resultText = `= [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;
      this.displayResult(formula, resultText);
    });
  }

  performScale(vectorNum) {
    const scalar = parseFloat(document.getElementById('scalar-input').value);
    if (isNaN(scalar)) return;

    let vector, result;

    if (vectorNum === 1 && this.vector1) {
      vector = this.vector1;
      result = vector.scale(scalar);
      result.label = `${scalar}v₁`;
      result.color = CONFIG.colors.vector1;
    } else if (vectorNum === 2 && this.vector2) {
      vector = this.vector2;
      result = vector.scale(scalar);
      result.label = `${scalar}v₂`;
      result.color = CONFIG.colors.vector2;
    } else {
      return;
    }

    this.animateToResult(result, () => {
      const formula = `${scalar}v${vectorNum} = ${scalar} × [${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}]`;
      const resultText = `= [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;
      this.displayResult(formula, resultText);
    });
  }

  performDot() {
    if (!this.vector1 || !this.vector2) return;

    const dotProduct = this.vector1.dot(this.vector2);
    const formula = `v₁ · v₂ = [${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}] · [${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}]`;
    const calculation = `= (${this.vector1.x.toFixed(1)} × ${this.vector2.x.toFixed(1)}) + (${this.vector1.y.toFixed(1)} × ${this.vector2.y.toFixed(1)})`;
    const resultText = `= ${dotProduct.toFixed(2)}`;

    this.resultVector = null;
    this.render();
    this.displayResult(formula, calculation, resultText);
  }

  performProject() {
    if (!this.vector1 || !this.vector2) return;

    const result = this.vector1.projectOnto(this.vector2);
    result.label = 'proj_v₂(v₁)';

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

    const angleRad = this.vector1.angleBetween(this.vector2);
    const angleDeg = this.vector1.angleBetweenDegrees(this.vector2);

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
    let vector, result;

    if (vectorNum === 1 && this.vector1) {
      vector = this.vector1;
      result = vector.normalize();
      result.label = 'û₁';
      result.color = CONFIG.colors.vector1;
    } else if (vectorNum === 2 && this.vector2) {
      vector = this.vector2;
      result = vector.normalize();
      result.label = 'û₂';
      result.color = CONFIG.colors.vector2;
    } else {
      return;
    }

    this.animateToResult(result, () => {
      const mag = vector.magnitude();
      const formula = `û${vectorNum} = v${vectorNum}/||v${vectorNum}||`;
      const calculation = `= [${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}]/${mag.toFixed(2)}`;
      const resultText = `= [${result.x.toFixed(3)}, ${result.y.toFixed(3)}] (magnitude = 1.0)`;
      this.displayResult(formula, calculation, resultText);
    });
  }

  performPerpendicular(vectorNum) {
    let vector, result;

    if (vectorNum === 1 && this.vector1) {
      vector = this.vector1;
      result = vector.perpendicular();
      result.label = 'v₁⊥';
      result.color = CONFIG.colors.vector1;
    } else if (vectorNum === 2 && this.vector2) {
      vector = this.vector2;
      result = vector.perpendicular();
      result.label = 'v₂⊥';
      result.color = CONFIG.colors.vector2;
    } else {
      return;
    }

    this.animateToResult(result, () => {
      const formula = `v${vectorNum}⊥ = [-y, x] (90° rotation)`;
      const calculation = `= [${-vector.y.toFixed(1)}, ${vector.x.toFixed(1)}]`;
      const resultText = `= [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;
      this.displayResult(formula, calculation, resultText);
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
      const progress = Math.min(elapsed / CONFIG.animationDuration, 1);

      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      this.resultVector = new Vector(
        this.animationFrom.x + (this.animationTo.x - this.animationFrom.x) * eased,
        this.animationFrom.y + (this.animationTo.y - this.animationFrom.y) * eased,
        this.animationTo.color,
        this.animationTo.label
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

  // ============================================================================
  // UI UPDATES
  // ============================================================================

  updateUI() {
    // Update Vector 1
    if (this.vector1) {
      document.getElementById('v1-coords').textContent =
        `[${this.vector1.x.toFixed(1)}, ${this.vector1.y.toFixed(1)}]`;
      document.getElementById('v1-magnitude').textContent =
        this.vector1.magnitude().toFixed(2);
      document.getElementById('v1-angle').textContent =
        `${this.vector1.angleDegrees().toFixed(1)}°`;
    } else {
      document.getElementById('v1-coords').textContent = 'Not created';
      document.getElementById('v1-magnitude').textContent = '—';
      document.getElementById('v1-angle').textContent = '—';
    }

    // Update Vector 2
    if (this.vector2) {
      document.getElementById('v2-coords').textContent =
        `[${this.vector2.x.toFixed(1)}, ${this.vector2.y.toFixed(1)}]`;
      document.getElementById('v2-magnitude').textContent =
        this.vector2.magnitude().toFixed(2);
      document.getElementById('v2-angle').textContent =
        `${this.vector2.angleDegrees().toFixed(1)}°`;
    } else {
      document.getElementById('v2-coords').textContent = 'Not created';
      document.getElementById('v2-magnitude').textContent = '—';
      document.getElementById('v2-angle').textContent = '—';
    }

    // Enable/disable operation buttons
    const bothExist = this.vector1 && this.vector2;
    document.getElementById('op-add').disabled = !bothExist;
    document.getElementById('op-subtract').disabled = !bothExist;
    document.getElementById('op-dot').disabled = !bothExist;
    document.getElementById('op-scale-v1').disabled = !this.vector1;
    document.getElementById('op-scale-v2').disabled = !this.vector2;

    // Enable/disable new operation buttons
    document.getElementById('op-project').disabled = !bothExist;
    document.getElementById('op-angle').disabled = !bothExist;
    document.getElementById('op-normalize-v1').disabled = !this.vector1;
    document.getElementById('op-normalize-v2').disabled = !this.vector2;
    document.getElementById('op-perp-v1').disabled = !this.vector1;
    document.getElementById('op-perp-v2').disabled = !this.vector2;
  }

  displayResult(...lines) {
    const resultsDiv = document.getElementById('results-display');
    resultsDiv.innerHTML = lines.map(line =>
      `<p class="formula">${line}</p>`
    ).join('');
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let app;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new LinearAlgebraApp();
  });
} else {
  app = new LinearAlgebraApp();
}
