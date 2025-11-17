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
      // Matrix A inputs
      m00: this.root.querySelector('#m00'),
      m01: this.root.querySelector('#m01'),
      m10: this.root.querySelector('#m10'),
      m11: this.root.querySelector('#m11'),
      // Matrix B inputs
      m00_b: this.root.querySelector('#m00_b'),
      m01_b: this.root.querySelector('#m01_b'),
      m10_b: this.root.querySelector('#m10_b'),
      m11_b: this.root.querySelector('#m11_b'),
      // Matrix B wrapper (for visibility control)
      matrixBWrapper: this.root.querySelector('#matrix-b-wrapper'),
      // Buttons
      showDeterminant: this.root.querySelector('#show-determinant'),
      matrixReset: this.root.querySelector('#matrix-reset'),
      // Determinant dropdown
      determinantMatrixSelect: this.root.querySelector('#determinant-matrix-select')
    };

    // Initialize ResultsPanel for result display
    const resultsElement = this.root.querySelector('#matrix-results');
    this.resultsPanel = resultsElement ? new ResultsPanel(resultsElement, 'Operations results will be displayed here') : null;

    // Matrix state
    this.inputMatrixA = Matrix.identity(2); // Matrix A
    this.inputMatrixB = Matrix.identity(2); // Matrix B

    // Basis vectors (î and ĵ) for matrix A
    this.basisVectors = {
      i: new Vector(1, 0, this.styleConstants.colors.matrixBasisI || '#ef4444', 'î'),
      j: new Vector(0, 1, this.styleConstants.colors.matrixBasisJ || '#3b82f6', 'ĵ')
    };

    // Visualization state
    this.showDeterminantArea = false;
    this.selectedDeterminantMatrix = 'A';

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
    this.applyMatrixVisibility();
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

  /**
   * Show/hide matrix B panel based on maxMatrices configuration
   */
  applyMatrixVisibility() {
    const matrixConfig = this.appConfig.matrixMode || {};
    const maxMatrices = matrixConfig.maxMatrices || 1;

    if (this.elements.matrixBWrapper) {
      if (maxMatrices >= 2) {
        this.elements.matrixBWrapper.style.display = '';
      } else {
        this.elements.matrixBWrapper.style.display = 'none';
      }
    }

    // Hide/show matrix B option in determinant dropdown
    if (this.elements.determinantMatrixSelect) {
      const optionB = this.elements.determinantMatrixSelect.querySelector('option[value="B"]');
      if (optionB) {
        if (maxMatrices >= 2) {
          optionB.style.display = '';
        } else {
          optionB.style.display = 'none';
          // If B is selected but not available, switch to A
          if (this.selectedDeterminantMatrix === 'B') {
            this.selectedDeterminantMatrix = 'A';
            this.elements.determinantMatrixSelect.value = 'A';
            if (this.showDeterminantArea) {
              this.updateDeterminantVisualization();
            }
          }
        }
      }
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  setupEventListeners() {
    // Matrix A input handlers
    const matrixAInputHandler = () => this.handleMatrixAInput();

    if (this.elements.m00) {
      this.elements.m00.addEventListener('input', matrixAInputHandler);
      this.eventListeners.push({ element: this.elements.m00, event: 'input', handler: matrixAInputHandler });
    }
    if (this.elements.m01) {
      this.elements.m01.addEventListener('input', matrixAInputHandler);
      this.eventListeners.push({ element: this.elements.m01, event: 'input', handler: matrixAInputHandler });
    }
    if (this.elements.m10) {
      this.elements.m10.addEventListener('input', matrixAInputHandler);
      this.eventListeners.push({ element: this.elements.m10, event: 'input', handler: matrixAInputHandler });
    }
    if (this.elements.m11) {
      this.elements.m11.addEventListener('input', matrixAInputHandler);
      this.eventListeners.push({ element: this.elements.m11, event: 'input', handler: matrixAInputHandler });
    }

    // Matrix B input handlers
    const matrixBInputHandler = () => this.handleMatrixBInput();

    if (this.elements.m00_b) {
      this.elements.m00_b.addEventListener('input', matrixBInputHandler);
      this.eventListeners.push({ element: this.elements.m00_b, event: 'input', handler: matrixBInputHandler });
    }
    if (this.elements.m01_b) {
      this.elements.m01_b.addEventListener('input', matrixBInputHandler);
      this.eventListeners.push({ element: this.elements.m01_b, event: 'input', handler: matrixBInputHandler });
    }
    if (this.elements.m10_b) {
      this.elements.m10_b.addEventListener('input', matrixBInputHandler);
      this.eventListeners.push({ element: this.elements.m10_b, event: 'input', handler: matrixBInputHandler });
    }
    if (this.elements.m11_b) {
      this.elements.m11_b.addEventListener('input', matrixBInputHandler);
      this.eventListeners.push({ element: this.elements.m11_b, event: 'input', handler: matrixBInputHandler });
    }

    // Determinant matrix dropdown
    if (this.elements.determinantMatrixSelect) {
      const handler = () => {
        this.selectedDeterminantMatrix = this.elements.determinantMatrixSelect.value;
        // If visualization is active, update it immediately
        if (this.showDeterminantArea) {
          this.updateDeterminantVisualization();
        }
      };
      this.elements.determinantMatrixSelect.addEventListener('change', handler);
      this.eventListeners.push({ element: this.elements.determinantMatrixSelect, event: 'change', handler });
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

  handleMatrixAInput() {
    // Read matrix A values from DOM inputs
    const m00 = parseFloat(this.elements.m00?.value) || 0;
    const m01 = parseFloat(this.elements.m01?.value) || 0;
    const m10 = parseFloat(this.elements.m10?.value) || 0;
    const m11 = parseFloat(this.elements.m11?.value) || 0;

    // Update input matrix A
    this.inputMatrixA = new Matrix(2, 2, [
      [m00, m01],
      [m10, m11]
    ]);

    // Log matrix input change
    logAction(`Matrix A input changed: [${m00.toFixed(1)}, ${m01.toFixed(1)}; ${m10.toFixed(1)}, ${m11.toFixed(1)}]`);

    // Update preview in real-time
    this.updatePreview();
  }

  handleMatrixBInput() {
    // Read matrix B values from DOM inputs
    const m00_b = parseFloat(this.elements.m00_b?.value) || 0;
    const m01_b = parseFloat(this.elements.m01_b?.value) || 0;
    const m10_b = parseFloat(this.elements.m10_b?.value) || 0;
    const m11_b = parseFloat(this.elements.m11_b?.value) || 0;

    // Update input matrix B
    this.inputMatrixB = new Matrix(2, 2, [
      [m00_b, m01_b],
      [m10_b, m11_b]
    ]);

    // Log matrix input change
    logAction(`Matrix B input changed: [${m00_b.toFixed(1)}, ${m01_b.toFixed(1)}; ${m10_b.toFixed(1)}, ${m11_b.toFixed(1)}]`);

    // Update preview in real-time
    this.updatePreview();
  }

  updatePreview() {
    // Update determinant display if visualization is active
    if (this.showDeterminantArea && this.resultsPanel) {
      this.updateDeterminantDisplay();
    }

    // Render to show current state (matrix column vectors update in real-time)
    this.render();
  }

  /**
   * Update determinant display based on selected matrix
   * @private
   */
  updateDeterminantDisplay() {
    if (!this.resultsPanel) return;

    const selectedMatrix = this.selectedDeterminantMatrix === 'A' ? this.inputMatrixA : this.inputMatrixB;
    const det = selectedMatrix.determinant();
    const matrixLabel = this.selectedDeterminantMatrix;
    const detText = `det(${matrixLabel}) = ${det.toFixed(2)}`;
    const orientationText = det >= 0 ? 'Orientation: preserved (positive)' : 'Orientation: flipped (negative)';
    this.displayResult(detText, orientationText);
  }

  /**
   * Update determinant visualization (called when dropdown changes or matrix updates)
   * @private
   */
  updateDeterminantVisualization() {
    if (!this.showDeterminantArea) return;

    this.updateDeterminantDisplay();
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

    // Calculate and display determinant for selected matrix
    const selectedMatrix = this.selectedDeterminantMatrix === 'A' ? this.inputMatrixA : this.inputMatrixB;
    const det = selectedMatrix.determinant();
    const matrixLabel = this.selectedDeterminantMatrix;

    if (this.resultsPanel && this.showDeterminantArea) {
      const detText = `det(${matrixLabel}) = ${det.toFixed(2)}`;
      const orientationText = det >= 0 ? 'Orientation: preserved (positive)' : 'Orientation: flipped (negative)';
      this.displayResult(detText, orientationText);
    } else if (this.resultsPanel && !this.showDeterminantArea) {
      // Clear results when hiding visualization
      this.resultsPanel.clear();
    }

    // Log determinant visualization toggle
    const action = this.showDeterminantArea ? 'enabled' : 'disabled';
    logAction(`Determinant visualization ${action}. det(${matrixLabel}) = ${det.toFixed(2)}`);

    this.render();

    if (window.StatusService) {
      window.StatusService.setReady();
    }
  }

  /**
   * Handle matrix reset button click
   * Resets both matrices to identity and clears determinant visualization
   */
  handleReset() {
    if (window.StatusService) {
      window.StatusService.setLoading();
    }

    this.inputMatrixA = Matrix.identity(2);
    this.inputMatrixB = Matrix.identity(2);

    // Update matrix A input fields
    if (this.elements.m00) this.elements.m00.value = '1';
    if (this.elements.m01) this.elements.m01.value = '0';
    if (this.elements.m10) this.elements.m10.value = '0';
    if (this.elements.m11) this.elements.m11.value = '1';

    // Update matrix B input fields
    if (this.elements.m00_b) this.elements.m00_b.value = '1';
    if (this.elements.m01_b) this.elements.m01_b.value = '0';
    if (this.elements.m10_b) this.elements.m10_b.value = '0';
    if (this.elements.m11_b) this.elements.m11_b.value = '1';

    this.showDeterminantArea = false;
    this.selectedDeterminantMatrix = 'A';

    // Reset Show Area button text
    if (this.elements.showDeterminant) {
      this.elements.showDeterminant.textContent = 'Show Area';
    }

    // Reset dropdown to A
    if (this.elements.determinantMatrixSelect) {
      this.elements.determinantMatrixSelect.value = 'A';
    }

    this.render();

    // Clear results
    if (this.resultsPanel) {
      this.resultsPanel.clear();
    }

    // Log action
    logAction('Matrices reset to identity');

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
   * Update matrix A input fields from current inputMatrixA state
   * @private
   */
  updateInputFieldsA() {
    if (this.elements.m00) this.elements.m00.value = this.inputMatrixA.get(0, 0).toFixed(1);
    if (this.elements.m01) this.elements.m01.value = this.inputMatrixA.get(0, 1).toFixed(1);
    if (this.elements.m10) this.elements.m10.value = this.inputMatrixA.get(1, 0).toFixed(1);
    if (this.elements.m11) this.elements.m11.value = this.inputMatrixA.get(1, 1).toFixed(1);
  }

  /**
   * Update matrix B input fields from current inputMatrixB state
   * @private
   */
  updateInputFieldsB() {
    if (this.elements.m00_b) this.elements.m00_b.value = this.inputMatrixB.get(0, 0).toFixed(1);
    if (this.elements.m01_b) this.elements.m01_b.value = this.inputMatrixB.get(0, 1).toFixed(1);
    if (this.elements.m10_b) this.elements.m10_b.value = this.inputMatrixB.get(1, 0).toFixed(1);
    if (this.elements.m11_b) this.elements.m11_b.value = this.inputMatrixB.get(1, 1).toFixed(1);
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

    // Update input matrix A
    this.inputMatrixA = presetMatrix.clone();

    // Update DOM input fields
    this.updateInputFieldsA();

    // Display result with formatted matrix
    if (this.resultsPanel && window.FormatUtils) {
      const matrixHtml = window.FormatUtils.formatMatrixAsGrid(this.inputMatrixA, 1);
      this.displayResult(`Applied preset matrix: ${matrixHtml}`);
    } else if (this.resultsPanel) {
      this.displayResult(`Applied preset matrix: ${this.inputMatrixA.toCompactString()}`);
    }

    // Log operation
    logAction(`Applied preset matrix: ${this.inputMatrixA.toCompactString()}`);

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

    // Transpose the matrix A
    this.inputMatrixA = this.inputMatrixA.transpose();

    // Update DOM input fields
    this.updateInputFieldsA();

    // Display result with formatted matrix
    if (this.resultsPanel && window.FormatUtils) {
      const matrixHtml = window.FormatUtils.formatMatrixAsGrid(this.inputMatrixA, 1);
      this.displayResult(`Transposed matrix: ${matrixHtml}`);
    } else if (this.resultsPanel) {
      this.displayResult(`Transposed matrix: ${this.inputMatrixA.toCompactString()}`);
    }

    // Log operation
    logAction(`Matrix transposed: ${this.inputMatrixA.toCompactString()}`);

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

    // Scale the matrix A
    this.inputMatrixA = this.inputMatrixA.scale(scalar);

    // Update DOM input fields
    this.updateInputFieldsA();

    // Display result with formatted matrix
    if (this.resultsPanel && window.FormatUtils) {
      const matrixHtml = window.FormatUtils.formatMatrixAsGrid(this.inputMatrixA, 1);
      this.displayResult(`Scalar multiplication (×${scalar.toFixed(1)}): ${matrixHtml}`);
    } else if (this.resultsPanel) {
      this.displayResult(`Scalar multiplication (×${scalar.toFixed(1)}): ${this.inputMatrixA.toCompactString()}`);
    }

    // Log operation
    logAction(`Matrix scaled by ${scalar.toFixed(1)}: ${this.inputMatrixA.toCompactString()}`);

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

    // Draw matrix A column vectors (î_A and ĵ_A)
    // Column 1: [m00, m10] → î_A vector
    // Column 2: [m01, m11] → ĵ_A vector
    const matrixAI = new Vector(
      this.inputMatrixA.get(0, 0),
      this.inputMatrixA.get(1, 0),
      this.styleConstants.colors.matrixBasisI || '#ef4444',
      'î'
    );
    const matrixAJ = new Vector(
      this.inputMatrixA.get(0, 1),
      this.inputMatrixA.get(1, 1),
      this.styleConstants.colors.matrixBasisJ || '#3b82f6',
      'ĵ'
    );
    this.drawVector(matrixAI, false, 1, false, null, 'A');
    this.drawVector(matrixAJ, false, 1, false, null, 'A');

    // Draw matrix B column vectors (î_B and ĵ_B) if maxMatrices >= 2
    const matrixConfig = this.appConfig.matrixMode || {};
    const maxMatrices = matrixConfig.maxMatrices || 1;

    // Declare matrix B vectors outside the conditional block so they're accessible for determinant visualization
    let matrixBI = null;
    let matrixBJ = null;

    if (maxMatrices >= 2) {
      // Column 1: [m00_b, m10_b] → î_B vector
      // Column 2: [m01_b, m11_b] → ĵ_B vector
      matrixBI = new Vector(
        this.inputMatrixB.get(0, 0),
        this.inputMatrixB.get(1, 0),
        this.styleConstants.colors.matrixBasisIB || '#f59e0b',
        'î'
      );
      matrixBJ = new Vector(
        this.inputMatrixB.get(0, 1),
        this.inputMatrixB.get(1, 1),
        this.styleConstants.colors.matrixBasisJB || '#a855f7',
        'ĵ'
      );
      this.drawVector(matrixBI, false, 1, false, null, 'B');
      this.drawVector(matrixBJ, false, 1, false, null, 'B');
    }

    // Draw determinant area visualization (parallelogram formed by selected matrix column vectors)
    if (this.showDeterminantArea) {
      if (this.selectedDeterminantMatrix === 'A') {
        this.drawTransformedSquare(matrixAI, matrixAJ, this.inputMatrixA, 'A');
      } else if (this.selectedDeterminantMatrix === 'B' && maxMatrices >= 2 && matrixBI && matrixBJ) {
        this.drawTransformedSquare(matrixBI, matrixBJ, this.inputMatrixB, 'B');
      }
    }
  }

  drawVector(vector, isDashed = false, opacity = 1, isHovered = false, lineWidthOverride = null, subscript = null) {
    // Use cached colors (loaded in constructor and updated on theme change)
    // MatrixMode doesn't use hover state, so pass false
    this.coordSystem.drawVector(vector, this.styleConstants, this.colors, isDashed, opacity, isHovered, lineWidthOverride, subscript);
  }

  drawTransformedSquare(matrixI, matrixJ, matrix, matrixLabel) {
    const ctx = this.coordSystem.ctx;
    const origin = this.coordSystem.mathToScreen(0, 0);
    const corner1 = this.coordSystem.mathToScreen(matrixI.x, matrixI.y);
    const corner2 = this.coordSystem.mathToScreen(
      matrixI.x + matrixJ.x,
      matrixI.y + matrixJ.y
    );
    const corner3 = this.coordSystem.mathToScreen(matrixJ.x, matrixJ.y);

    const det = matrix.determinant();

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

    ctx.fillText(`det(${matrixLabel}) = ${Math.abs(det).toFixed(2)}`, centerX, centerY);

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
    this.inputMatrixA = null;
    this.inputMatrixB = null;
    this.basisVectors = null;
    this.showDeterminantArea = false;
  }
}
