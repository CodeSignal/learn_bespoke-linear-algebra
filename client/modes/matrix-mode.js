/**
 * MatrixMode Class
 * Handles matrix visualization, transformations, and interactions
 */

class MatrixMode {
  constructor(appConfig, styleConstants, coordinateSystem, rootElement) {
    this.appConfig = appConfig; // Runtime configuration from config.json
    this.styleConstants = styleConstants; // Styling constants
    this.coordSystem = coordinateSystem;
    this.root = rootElement;

    // Cache frequently used DOM elements
    this.elements = {
      // Matrix inputs
      m00: this.root.querySelector('#m00'),
      m01: this.root.querySelector('#m01'),
      m10: this.root.querySelector('#m10'),
      m11: this.root.querySelector('#m11'),
      // Buttons
      showDeterminant: this.root.querySelector('#show-determinant'),
      matrixReset: this.root.querySelector('#matrix-reset')
    };

    // Initialize ResultsPanel for result display
    const resultsElement = this.root.querySelector('#matrix-results');
    this.resultsPanel = resultsElement ? new ResultsPanel(resultsElement, 'Operations results will be displayed here') : null;

    // Matrix state
    this.inputMatrix = Matrix.identity(2); // Current transformation matrix

    // Basis vectors (î and ĵ)
    this.basisVectors = {
      i: new Vector(1, 0, this.styleConstants.colors.matrixBasisI || '#ef4444', 'î'),
      j: new Vector(0, 1, this.styleConstants.colors.matrixBasisJ || '#3b82f6', 'ĵ')
    };

    // Visualization state
    this.showDeterminantArea = false;

    // Color cache for theme-responsive rendering
    this.colors = {};
    this.accentColor = null;
    this.dangerColor = null;

    // Event listener references for cleanup
    this.eventListeners = [];
    this.themeUnsubscribe = null;

    // Load colors from CanvasThemeService
    this.loadColors();

    // Subscribe to theme changes
    if (window.CanvasThemeService) {
      this.themeUnsubscribe = window.CanvasThemeService.subscribe(() => {
        this.loadColors();
        this.render();
      });
    }

    this.setupEventListeners();
    this.applyOperationGroupVisibility();
  }

  // ============================================================================
  // COLOR MANAGEMENT
  // ============================================================================

  /**
   * Load colors from CanvasThemeService
   */
  loadColors() {
    // Load theme-responsive colors from CanvasThemeService
    const themeColors = window.CanvasThemeService
      ? window.CanvasThemeService.getColors()
      : {
          grid: this.styleConstants.colors.grid,
          axis: this.styleConstants.colors.axis,
          text: this.styleConstants.colors.text,
          hover: this.styleConstants.colors.hover,
          hoverHighlight: this.styleConstants.colors.hoverHighlight,
          accent: '#3b82f6',
          danger: '#ef4444'
        };

    // Store colors
    this.colors = themeColors;

    // Cache accent and danger colors for drawTransformedSquare
    this.accentColor = themeColors.accent || '#10b981';
    this.dangerColor = themeColors.danger || '#ef4444';

    // Update CoordinateSystem colors
    this.coordSystem.updateColors(themeColors);
  }

  // ============================================================================
  // APP-CONFIG-DRIVEN UI VISIBILITY
  // ============================================================================

  applyOperationGroupVisibility() {
    // Get config from appConfig
    const matrixConfig = this.appConfig.matrixMode || {};
    const operationGroups = matrixConfig.operationGroups || {};

    // Show/hide determinant visualization section
    const showDeterminant = operationGroups.determinant !== false;
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
    const matrixInputHandler = () => this.handleMatrixInput();

    if (this.elements.m00) {
      this.elements.m00.addEventListener('input', matrixInputHandler);
      this.eventListeners.push({ element: this.elements.m00, event: 'input', handler: matrixInputHandler });
    }
    if (this.elements.m01) {
      this.elements.m01.addEventListener('input', matrixInputHandler);
      this.eventListeners.push({ element: this.elements.m01, event: 'input', handler: matrixInputHandler });
    }
    if (this.elements.m10) {
      this.elements.m10.addEventListener('input', matrixInputHandler);
      this.eventListeners.push({ element: this.elements.m10, event: 'input', handler: matrixInputHandler });
    }
    if (this.elements.m11) {
      this.elements.m11.addEventListener('input', matrixInputHandler);
      this.eventListeners.push({ element: this.elements.m11, event: 'input', handler: matrixInputHandler });
    }

    // Show determinant button
    if (this.elements.showDeterminant) {
      const handler = () => this.toggleDeterminantVisualization();
      this.elements.showDeterminant.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.showDeterminant, event: 'click', handler });
    }

    // Reset button handler (moved from linear-algebra.js)
    if (this.elements.matrixReset) {
      const handler = () => this.handleReset();
      this.elements.matrixReset.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.matrixReset, event: 'click', handler });
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

    // Log matrix input change
    logAction(`Matrix input changed: [${m00.toFixed(1)}, ${m01.toFixed(1)}; ${m10.toFixed(1)}, ${m11.toFixed(1)}]`);

    // Update preview in real-time
    this.updatePreview();
  }

  updatePreview() {
    // Update determinant display if visualization is active
    if (this.showDeterminantArea && this.resultsPanel) {
      const det = this.inputMatrix.determinant();
      const detText = `det(A) = ${det.toFixed(2)}`;
      const orientationText = det >= 0 ? 'Orientation: preserved (positive)' : 'Orientation: flipped (negative)';
      this.displayResult(detText, orientationText);
    }

    // Render to show current state (matrix column vectors update in real-time)
    this.render();
  }

  toggleDeterminantVisualization() {
    if (window.StatusService) {
      window.StatusService.setLoading();
    }

    this.showDeterminantArea = !this.showDeterminantArea;

    if (this.elements.showDeterminant) {
      this.elements.showDeterminant.textContent = this.showDeterminantArea ? 'Hide Area' : 'Show Area';
    }

    // Calculate and display determinant
    const det = this.inputMatrix.determinant();
    if (this.resultsPanel && this.showDeterminantArea) {
      const detText = `det(A) = ${det.toFixed(2)}`;
      const orientationText = det >= 0 ? 'Orientation: preserved (positive)' : 'Orientation: flipped (negative)';
      this.displayResult(detText, orientationText);
    } else if (this.resultsPanel && !this.showDeterminantArea) {
      // Clear results when hiding visualization
      this.resultsPanel.clear();
    }

    // Log determinant visualization toggle
    const action = this.showDeterminantArea ? 'enabled' : 'disabled';
    logAction(`Determinant visualization ${action}. det(A) = ${det.toFixed(2)}`);

    this.render();

    if (window.StatusService) {
      window.StatusService.setReady();
    }
  }

  /**
   * Handle matrix reset button click
   * Resets matrix to identity and clears determinant visualization
   */
  handleReset() {
    if (window.StatusService) {
      window.StatusService.setLoading();
    }

    this.inputMatrix = Matrix.identity(2);

    // Update input fields
    if (this.elements.m00) this.elements.m00.value = '1';
    if (this.elements.m01) this.elements.m01.value = '0';
    if (this.elements.m10) this.elements.m10.value = '0';
    if (this.elements.m11) this.elements.m11.value = '1';

    this.showDeterminantArea = false;

    // Reset Show Area button text
    if (this.elements.showDeterminant) {
      this.elements.showDeterminant.textContent = 'Show Area';
    }

    this.render();

    // Clear results
    if (this.resultsPanel) {
      this.resultsPanel.clear();
    }

    // Log action
    logAction('Matrix reset to identity');

    if (window.StatusService) {
      window.StatusService.setReady();
    }
  }

  // ============================================================================
  // RESULT DISPLAY HELPERS
  // ============================================================================

  /**
   * Display result lines in the results panel
   * Uses ResultsPanel and FormatUtils for consistent formatting
   * @param {...string} lines - One or more lines to display (can contain HTML)
   */
  displayResult(...lines) {
    if (this.resultsPanel) {
      this.resultsPanel.show(...lines);
    }
  }

  /**
   * Update matrix input fields from current inputMatrix state
   * @private
   */
  updateInputFields() {
    if (this.elements.m00) this.elements.m00.value = this.inputMatrix.get(0, 0).toFixed(1);
    if (this.elements.m01) this.elements.m01.value = this.inputMatrix.get(0, 1).toFixed(1);
    if (this.elements.m10) this.elements.m10.value = this.inputMatrix.get(1, 0).toFixed(1);
    if (this.elements.m11) this.elements.m11.value = this.inputMatrix.get(1, 1).toFixed(1);
  }

  // ============================================================================
  // EXTENSIBLE OPERATION HOOKS
  // ============================================================================

  /**
   * Apply a preset transformation matrix
   * Stub for future implementation of preset transformations (rotation, scaling, reflection)
   * @param {Matrix} presetMatrix - Preset transformation matrix to apply
   */
  applyPreset(presetMatrix) {
    if (!presetMatrix || !(presetMatrix instanceof Matrix)) {
      console.warn('applyPreset: invalid matrix provided');
      return;
    }

    if (window.StatusService) {
      window.StatusService.setLoading();
    }

    // Update input matrix
    this.inputMatrix = presetMatrix.clone();

    // Update DOM input fields
    this.updateInputFields();

    // Display result with formatted matrix
    if (this.resultsPanel && window.FormatUtils) {
      const matrixHtml = window.FormatUtils.formatMatrixAsGrid(this.inputMatrix, 1);
      this.displayResult(`Applied preset matrix: ${matrixHtml}`);
    } else if (this.resultsPanel) {
      this.displayResult(`Applied preset matrix: ${this.inputMatrix.toCompactString()}`);
    }

    // Log operation
    logAction(`Applied preset matrix: ${this.inputMatrix.toCompactString()}`);

    // Update visualization
    this.updatePreview();

    if (window.StatusService) {
      window.StatusService.setReady();
    }
  }

  /**
   * Transpose the current matrix
   * Stub for future implementation of transpose operation
   */
  transpose() {
    if (window.StatusService) {
      window.StatusService.setLoading();
    }

    // Transpose the matrix
    this.inputMatrix = this.inputMatrix.transpose();

    // Update DOM input fields
    this.updateInputFields();

    // Display result with formatted matrix
    if (this.resultsPanel && window.FormatUtils) {
      const matrixHtml = window.FormatUtils.formatMatrixAsGrid(this.inputMatrix, 1);
      this.displayResult(`Transposed matrix: ${matrixHtml}`);
    } else if (this.resultsPanel) {
      this.displayResult(`Transposed matrix: ${this.inputMatrix.toCompactString()}`);
    }

    // Log operation
    logAction(`Matrix transposed: ${this.inputMatrix.toCompactString()}`);

    // Update visualization
    this.updatePreview();

    if (window.StatusService) {
      window.StatusService.setReady();
    }
  }

  /**
   * Multiply matrix by a scalar
   * Stub for future implementation of scalar multiplication operation
   * @param {number} scalar - Scalar value to multiply by
   */
  scalarMultiply(scalar) {
    if (typeof scalar !== 'number' || isNaN(scalar)) {
      console.warn('scalarMultiply: invalid scalar provided');
      return;
    }

    if (window.StatusService) {
      window.StatusService.setLoading();
    }

    // Scale the matrix
    this.inputMatrix = this.inputMatrix.scale(scalar);

    // Update DOM input fields
    this.updateInputFields();

    // Display result with formatted matrix
    if (this.resultsPanel && window.FormatUtils) {
      const matrixHtml = window.FormatUtils.formatMatrixAsGrid(this.inputMatrix, 1);
      this.displayResult(`Scalar multiplication (×${scalar.toFixed(1)}): ${matrixHtml}`);
    } else if (this.resultsPanel) {
      this.displayResult(`Scalar multiplication (×${scalar.toFixed(1)}): ${this.inputMatrix.toCompactString()}`);
    }

    // Log operation
    logAction(`Matrix scaled by ${scalar.toFixed(1)}: ${this.inputMatrix.toCompactString()}`);

    // Update visualization
    this.updatePreview();

    if (window.StatusService) {
      window.StatusService.setReady();
    }
  }

  /**
   * Calculate and display eigenvectors
   * Stub for future implementation of eigenvector calculation and visualization
   */
  showEigenvectors() {
    if (window.StatusService) {
      window.StatusService.setLoading();
    }

    // TODO: Implement eigenvector calculation
    // For now, display a placeholder message
    if (this.resultsPanel) {
      this.displayResult(
        'Eigenvectors: Not yet implemented',
        'This feature will calculate and visualize the eigenvectors of the matrix.'
      );
    }

    // Log operation
    logAction('Eigenvector calculation requested (not yet implemented)');

    if (window.StatusService) {
      window.StatusService.setReady();
    }
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
      this.styleConstants.colors.matrixBasisI || '#ef4444',
      'î'
    );
    const matrixJ = new Vector(
      this.inputMatrix.get(0, 1),
      this.inputMatrix.get(1, 1),
      this.styleConstants.colors.matrixBasisJ || '#3b82f6',
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
    this.coordSystem.drawVector(vector, this.styleConstants, this.colors, isDashed, opacity, false);
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

    ctx.save();
    ctx.globalAlpha = 0.3;

    // Use cached accent/danger colors from theme service
    const fillColor = det >= 0 ? this.accentColor : this.dangerColor;

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
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Clean up resources when mode is destroyed
   */
  destroy() {
    // Remove all event listeners
    if (this.eventListeners) {
      this.eventListeners.forEach(({ element, event, handler }) => {
        if (element && typeof element.removeEventListener === 'function') {
          element.removeEventListener(event, handler);
        }
      });
      this.eventListeners = [];
    }

    // Unsubscribe from theme service
    if (this.themeUnsubscribe) {
      this.themeUnsubscribe();
      this.themeUnsubscribe = null;
    }

    // Clear state
    this.inputMatrix = null;
    this.basisVectors = null;
    this.showDeterminantArea = false;
  }
}
