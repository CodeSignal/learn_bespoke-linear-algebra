/**
 * MatrixMode Class
 * Handles matrix visualization, transformations, and interactions
 */

class MatrixMode {
  constructor(coordinateSystem, rootElement) {
    this.coordSystem = coordinateSystem;
    this.root = rootElement;

    // Cache frequently used DOM elements
    this.elements = {
      // Matrix inputs
      m00: this.root.querySelector('#m00'),
      m01: this.root.querySelector('#m01'),
      m10: this.root.querySelector('#m10'),
      m11: this.root.querySelector('#m11'),
      // Results container
      results: this.root.querySelector('#matrix-results'),
      // Buttons
      showDeterminant: this.root.querySelector('#show-determinant'),
      matrixReset: this.root.querySelector('#matrix-reset')
    };

    // Matrix state
    this.inputMatrix = Matrix.identity(2); // Current transformation matrix

    // Basis vectors (î and ĵ)
    this.basisVectors = {
      i: new Vector(1, 0, CONFIG.colors.matrixBasisI || '#ef4444', 'î'),
      j: new Vector(0, 1, CONFIG.colors.matrixBasisJ || '#3b82f6', 'ĵ')
    };

    // Visualization state
    this.showDeterminantArea = false;

    // Color cache for theme-responsive rendering
    this.colors = {};

    // Load colors from CSS (standardized approach)
    this.loadColorsFromCSS();

    // Set up theme listener for consistent theme handling
    this.setupThemeListener();

    this.setupEventListeners();
    this.applyOperationGroupVisibility();
  }

  // ============================================================================
  // COLOR MANAGEMENT
  // ============================================================================

  /**
   * Load colors from CSS using ColorUtils (standardized approach)
   */
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

    // Store colors
    this.colors = colors;

    // Update CoordinateSystem colors
    this.coordSystem.updateColors(colors);
  }

  /**
   * Set up theme change listener (standardized approach)
   */
  setupThemeListener() {
    // Listen for system theme changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    darkModeQuery.addEventListener('change', () => {
      this.loadColorsFromCSS();  // Reload colors (updates CoordinateSystem automatically)
      this.render();             // Re-render canvas
    });
  }

  // ============================================================================
  // CONFIG-DRIVEN UI VISIBILITY
  // ============================================================================

  applyOperationGroupVisibility() {
    // Get config with defaults
    const config = CONFIG.matrixOperationGroups || {
      determinant: true
    };

    // Show/hide determinant visualization section
    const showDeterminant = config.determinant !== false;
    const determinantSection = this.root.querySelector('.operation-group');
    if (determinantSection) {
      const label = determinantSection.querySelector('.operation-label span');
      if (label && label.textContent.includes('Determinant')) {
        determinantSection.style.display = showDeterminant ? '' : 'none';
      }
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  setupEventListeners() {
    // Matrix input handlers
    if (this.elements.m00) this.elements.m00.addEventListener('input', () => this.handleMatrixInput());
    if (this.elements.m01) this.elements.m01.addEventListener('input', () => this.handleMatrixInput());
    if (this.elements.m10) this.elements.m10.addEventListener('input', () => this.handleMatrixInput());
    if (this.elements.m11) this.elements.m11.addEventListener('input', () => this.handleMatrixInput());

    // Show determinant button
    if (this.elements.showDeterminant) {
      this.elements.showDeterminant.addEventListener('click', () => this.toggleDeterminantVisualization());
    }
  }

  // ============================================================================
  // MATRIX INPUT HANDLING
  // ============================================================================

  handleMatrixInput() {
    // Read matrix values from DOM inputs
    const m00 = parseFloat(this.elements.m00?.value) || 0;
    const m01 = parseFloat(this.elements.m01?.value) || 0;
    const m10 = parseFloat(this.elements.m10?.value) || 0;
    const m11 = parseFloat(this.elements.m11?.value) || 0;

    // Update input matrix
    this.inputMatrix = new Matrix(2, 2, [
      [m00, m01],
      [m10, m11]
    ]);

    // Update preview in real-time
    this.updatePreview();
  }

  updatePreview() {
    // Render to show current state (matrix column vectors update in real-time)
    this.render();
  }

  toggleDeterminantVisualization() {
    this.showDeterminantArea = !this.showDeterminantArea;

    if (this.elements.showDeterminant) {
      this.elements.showDeterminant.textContent = this.showDeterminantArea ? 'Hide Area' : 'Show Area';
    }

    this.render();
  }

  // ============================================================================
  // RESULT DISPLAY HELPERS
  // ============================================================================

  /**
   * Format a matrix as an HTML grid element
   * @param {Matrix} matrix - Matrix instance to format
   * @param {number} precision - Decimal places (default: 1)
   * @returns {string} - HTML string with matrix grid
   */
  formatMatrixAsGrid(matrix, precision = 1) {
    const rows = matrix.rows;
    const cols = matrix.cols;
    // Create inline grid without padding/background for results display
    let html = '<span style="display: inline-flex; flex-direction: column; gap: 0.125rem; margin: 0 0.25rem; vertical-align: middle;">';

    for (let i = 0; i < rows; i++) {
      html += '<span style="display: flex; gap: 0.25rem; justify-content: center;">';
      for (let j = 0; j < cols; j++) {
        const value = matrix.get(i, j).toFixed(precision);
        html += `<span style="display: inline-block; min-width: 2.5em; text-align: center; font-family: monospace;">${value}</span>`;
      }
      html += '</span>';
    }
    html += '</span>';
    return html;
  }

  /**
   * Format a vector as a string
   * @param {Vector} vector - Vector instance to format
   * @param {number} precision - Decimal places (default: 1)
   * @returns {string} - Formatted vector string like [x, y]
   */
  formatVector(vector, precision = 1) {
    return `[${vector.x.toFixed(precision)}, ${vector.y.toFixed(precision)}]`;
  }

  /**
   * Display result lines in the results panel (similar to vector mode)
   * @param {...string} lines - One or more lines to display (can contain HTML)
   */
  displayResult(...lines) {
    if (!this.elements.results) return;

    this.elements.results.innerHTML = lines.map(line =>
      `<p class="formula">${line}</p>`
    ).join('');
  }


  // ============================================================================
  // RENDERING
  // ============================================================================

  render() {
    const ctx = this.coordSystem.ctx;

    // Clear canvas
    this.coordSystem.clear();

    // Draw grid and axes
    this.coordSystem.drawGrid();
    this.coordSystem.drawAxes();

    // Always draw matrix column vectors (i_hat and j_hat) from inputMatrix
    // Column 1: [m00, m10] → i_hat vector
    // Column 2: [m01, m11] → j_hat vector
    const matrixI = new Vector(
      this.inputMatrix.get(0, 0),
      this.inputMatrix.get(1, 0),
      CONFIG.colors.matrixBasisI || '#ef4444',
      'î'
    );
    const matrixJ = new Vector(
      this.inputMatrix.get(0, 1),
      this.inputMatrix.get(1, 1),
      CONFIG.colors.matrixBasisJ || '#3b82f6',
      'ĵ'
    );
    this.drawVector(matrixI, false, 1);
    this.drawVector(matrixJ, false, 1);

    // Draw determinant area visualization (parallelogram formed by matrix column vectors)
    if (this.showDeterminantArea) {
      this.drawTransformedSquare(matrixI, matrixJ);
    }
  }

  drawVector(vector, isDashed = false, opacity = 1) {
    // Use cached colors (loaded in constructor and updated on theme change)
    // MatrixMode doesn't use hover state, so pass false
    this.coordSystem.drawVector(vector, CONFIG, this.colors, isDashed, opacity, false);
  }

  drawTransformedSquare(matrixI, matrixJ) {
    const ctx = this.coordSystem.ctx;
    const origin = this.coordSystem.mathToScreen(0, 0);
    const corner1 = this.coordSystem.mathToScreen(matrixI.x, matrixI.y);
    const corner2 = this.coordSystem.mathToScreen(
      matrixI.x + matrixJ.x,
      matrixI.y + matrixJ.y
    );
    const corner3 = this.coordSystem.mathToScreen(matrixJ.x, matrixJ.y);

    const det = this.inputMatrix.determinant();

    // Get colors from CSS
    const accentColor = window.ColorUtils
      ? window.ColorUtils.getColorFromCSS('--bespoke-accent', '#10b981')
      : '#10b981';
    const dangerColor = window.ColorUtils
      ? window.ColorUtils.getColorFromCSS('--bespoke-danger', '#ef4444')
      : '#ef4444';

    ctx.save();
    ctx.globalAlpha = 0.3;

    // Color based on determinant sign
    const fillColor = det >= 0 ? accentColor : dangerColor;

    // Fill parallelogram
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(corner1.x, corner1.y);
    ctx.lineTo(corner2.x, corner2.y);
    ctx.lineTo(corner3.x, corner3.y);
    ctx.closePath();
    ctx.fill();

    // Draw outline
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw area label at center
    ctx.globalAlpha = 1;
    ctx.font = 'bold 14px Arial';
    // Use darker shade for text (approximate darkening)
    ctx.fillStyle = fillColor; // Will use the same color, but could be enhanced with darkening
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = (origin.x + corner1.x + corner2.x + corner3.x) / 4;
    const centerY = (origin.y + corner1.y + corner2.y + corner3.y) / 4;

    ctx.fillText(`det(A) = ${Math.abs(det).toFixed(2)}`, centerX, centerY);

    ctx.restore();
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanup() {
    // No cleanup needed - no animations or timers to cancel
  }
}
