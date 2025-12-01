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
      // Vector inputs
      vectorVx: this.root.querySelector('#vector-vx'),
      vectorVy: this.root.querySelector('#vector-vy'),
      // Vector wrapper (for visibility control)
      vectorVWrapper: this.root.querySelector('#vector-v-wrapper'),
      // Buttons
      showDeterminant: this.root.querySelector('#show-determinant'),
      matrixReset: this.root.querySelector('#matrix-reset'),
      // Operation buttons
      opMatrixAdd: this.root.querySelector('#op-matrix-add'),
      opMatrixScale: this.root.querySelector('#op-matrix-scale'),
      opMatrixMultiply: this.root.querySelector('#op-matrix-multiply'),
      opComputeAx: this.root.querySelector('#op-compute-ax'),
      // Scalar multiplication controls
      matrixScalarInput: this.root.querySelector('#matrix-scalar-input')
    };

    // Initialize ResultsPanel for result display
    const resultsElement = document.querySelector('#matrix-results');
    this.resultsPanel = resultsElement ? new ResultsPanel(resultsElement, {
      emptyMessage: 'Operations results will be displayed here',
      canvasContainer: document.querySelector('.canvas-container'),
      coordSystem: this.coordSystem,
      modeInstance: this
    }) : null;

    // Initialize MatrixOperations
    this.operations = new MatrixOperations(appConfig, styleConstants);

    // Initialize dropdowns
    this.dropdowns = {};
    this.initializeDropdowns();

    // Matrix state
    this.inputMatrixA = Matrix.identity(2); // Matrix A
    this.inputMatrixB = Matrix.identity(2); // Matrix B

    // Vector state (for includeVector mode)
    const matrixConfig = this.appConfig.matrixMode || {};
    const includeVector = matrixConfig.includeVector || false;
    this.inputVector = new Vector(1, 1, '#10b981', 'v'); // Default green color for vector

    // Basis vectors (î and ĵ) for matrix A
    this.basisVectors = {
      i: new Vector(1, 0, this.styleConstants.colors.matrixBasisI || '#ef4444', 'î'),
      j: new Vector(0, 1, this.styleConstants.colors.matrixBasisJ || '#3b82f6', 'ĵ')
    };

    // Visualization state
    this.showDeterminantArea = false;
    this.selectedDeterminantMatrix = 'A';

    // Animation state
    this.isAnimating = false;
    this.animationFrom = null;
    this.animationTo = null;
    this.animationControl = null;
    this.resultVector = null; // For transformed vector

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
    this.updateButtonStates(); // Initialize button states
  }

  /**
   * Initialize all dropdown components
   */
  initializeDropdowns() {
    // Matrix scalar select dropdown
    const matrixScalarContainer = this.root.querySelector('#matrix-scalar-dropdown');
    if (matrixScalarContainer && window.Dropdown) {
      this.dropdowns.matrixScalarSelect = new window.Dropdown(matrixScalarContainer, {
        items: [
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' }
        ],
        selectedValue: 'A',
        growToFit: true
      });
    }

    // Determinant matrix select dropdown
    const determinantMatrixContainer = this.root.querySelector('#determinant-matrix-dropdown');
    if (determinantMatrixContainer && window.Dropdown) {
      this.dropdowns.determinantMatrixSelect = new window.Dropdown(determinantMatrixContainer, {
        items: [
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' }
        ],
        selectedValue: 'A',
        growToFit: true,
        onSelect: (value) => {
          this.selectedDeterminantMatrix = value;
          // If visualization is active, update it immediately
          if (this.showDeterminantArea) {
            this.updateDeterminantVisualization();
          }
        }
      });
    }
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
    const includeVector = matrixConfig.includeVector || false;

    const shouldShowGroup = (groupName) => {
      // First check includeVector override rules
      if (includeVector) {
        // Hide two-matrix operations when vector mode is active
        if (groupName === 'addition' || groupName === 'scalarMultiplication' || groupName === 'multiplication') {
          return false;
        }
      } else {
        // Hide linear transformation when vector is not included
        if (groupName === 'linearTransformation') {
          return false;
        }
      }

      // Then check if the operation group is enabled in configuration
      if (operationGroups[groupName] === false) {
        return false;
      }
      return true;
    };

    // Show/hide operation groups based on configuration
    const operationGroupElements = this.root.querySelectorAll('[data-operation-group]');
    operationGroupElements.forEach(element => {
      const groupName = element.getAttribute('data-operation-group');
      if (shouldShowGroup(groupName)) {
        element.style.display = '';
      } else {
        element.style.display = 'none';
      }
    });
  }

  /**
   * Show/hide matrix B panel based on maxMatrices configuration
   * If includeVector is true, it takes precedence over maxMatrices
   */
  applyMatrixVisibility() {
    const matrixConfig = this.appConfig.matrixMode || {};
    const maxMatrices = matrixConfig.maxMatrices || 1;
    const includeVector = matrixConfig.includeVector || false;

    // If includeVector is true, it takes precedence - hide matrix B and show vector
    if (includeVector) {
      // Hide matrix B wrapper
      if (this.elements.matrixBWrapper) {
        this.elements.matrixBWrapper.style.display = 'none';
      }
      // Show vector wrapper
      if (this.elements.vectorVWrapper) {
        this.elements.vectorVWrapper.style.display = '';
      }
      // Hide matrix B option in determinant dropdown (only A available)
      if (this.dropdowns.determinantMatrixSelect) {
        const currentValue = this.dropdowns.determinantMatrixSelect.getValue();
        // If B is selected but not available, switch to A
        if (currentValue === 'B') {
          this.selectedDeterminantMatrix = 'A';
          this.dropdowns.determinantMatrixSelect.setValue('A');
          if (this.showDeterminantArea) {
            this.updateDeterminantVisualization();
          }
        }
        // Recreate dropdown with only A option
        this.updateDeterminantDropdown(false);
      }
    } else {
      // Normal behavior: use maxMatrices to determine visibility
      if (this.elements.matrixBWrapper) {
        if (maxMatrices >= 2) {
          this.elements.matrixBWrapper.style.display = '';
        } else {
          this.elements.matrixBWrapper.style.display = 'none';
        }
      }
      // Hide vector wrapper
      if (this.elements.vectorVWrapper) {
        this.elements.vectorVWrapper.style.display = 'none';
      }
      // Hide/show matrix B option in determinant dropdown
      if (this.dropdowns.determinantMatrixSelect) {
        const currentValue = this.dropdowns.determinantMatrixSelect.getValue();
        // If B is selected but not available, switch to A
        if (maxMatrices < 2 && currentValue === 'B') {
          this.selectedDeterminantMatrix = 'A';
          this.dropdowns.determinantMatrixSelect.setValue('A');
          if (this.showDeterminantArea) {
            this.updateDeterminantVisualization();
          }
        }
        // Recreate dropdown with appropriate options
        this.updateDeterminantDropdown(maxMatrices >= 2);
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

    // Determinant matrix dropdown is handled via onSelect callback in initializeDropdowns

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

    // Matrix addition button
    if (this.elements.opMatrixAdd) {
      const handler = () => this.handleAdd();
      this.elements.opMatrixAdd.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opMatrixAdd, event: 'click', handler });
    }

    // Scalar multiplication button
    if (this.elements.opMatrixScale) {
      const handler = () => this.handleScalarMultiply();
      this.elements.opMatrixScale.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opMatrixScale, event: 'click', handler });
    }

    // Matrix multiplication button
    if (this.elements.opMatrixMultiply) {
      const handler = () => this.handleMultiply();
      this.elements.opMatrixMultiply.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opMatrixMultiply, event: 'click', handler });
    }

    // Compute Ax button
    if (this.elements.opComputeAx) {
      const handler = () => this.handleComputeAx();
      this.elements.opComputeAx.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opComputeAx, event: 'click', handler });
    }

    // Vector input handlers
    const vectorInputHandler = () => this.handleVectorInput();

    if (this.elements.vectorVx) {
      this.elements.vectorVx.addEventListener('input', vectorInputHandler);
      this.eventListeners.push({ element: this.elements.vectorVx, event: 'input', handler: vectorInputHandler });
    }
    if (this.elements.vectorVy) {
      this.elements.vectorVy.addEventListener('input', vectorInputHandler);
      this.eventListeners.push({ element: this.elements.vectorVy, event: 'input', handler: vectorInputHandler });
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

    // Cancel any running animation
    if (this.animationControl) {
      this.animationControl.cancel();
      this.animationControl = null;
      this.isAnimating = false;
    }

    // Clear result vector when matrix A changes (since Ax will be different)
    this.resultVector = null;

    // Update preview in real-time
    this.updatePreview();
    // Update button states
    this.updateButtonStates();
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
    // Update button states
    this.updateButtonStates();
  }

  handleVectorInput() {
    // Read vector v values from DOM inputs
    const vx = parseFloat(this.elements.vectorVx?.value) || 0;
    const vy = parseFloat(this.elements.vectorVy?.value) || 0;

    // Update input vector
    this.inputVector = new Vector(vx, vy, '#10b981', 'v');

    // Log vector input change
    logAction(`Vector v input changed: [${vx.toFixed(1)}, ${vy.toFixed(1)}]`);

    // Cancel any running animation
    if (this.animationControl) {
      this.animationControl.cancel();
      this.animationControl = null;
      this.isAnimating = false;
    }

    // Clear result vector when input vector changes (since Ax will be different)
    this.resultVector = null;

    // Update preview in real-time
    this.updatePreview();
    // Update button states
    this.updateButtonStates();
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
   * Also resets vector to (0, 0) if includeVector is true
   */
  handleReset() {
    if (window.StatusService) {
      window.StatusService.setLoading();
    }

    const matrixConfig = this.appConfig.matrixMode || {};
    const includeVector = matrixConfig.includeVector || false;

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

    // Reset vector if includeVector is true
    if (includeVector) {
      this.inputVector = new Vector(1, 1, '#10b981', 'v');
      if (this.elements.vectorVx) this.elements.vectorVx.value = '1';
      if (this.elements.vectorVy) this.elements.vectorVy.value = '1';
    }

    this.showDeterminantArea = false;
    this.selectedDeterminantMatrix = 'A';

    // Reset Show Area button text
    if (this.elements.showDeterminant) {
      this.elements.showDeterminant.textContent = 'Show Area';
    }

    // Reset dropdown to A
    if (this.dropdowns.determinantMatrixSelect) {
      this.dropdowns.determinantMatrixSelect.setValue('A');
    }

    this.render();

    // Clear results
    if (this.resultsPanel) {
      this.resultsPanel.clear();
    }

    // Clear result vector
    this.resultVector = null;

    // Log action
    logAction('Matrices reset to identity');

    if (window.StatusService) {
      window.StatusService.setReady();
    }

    // Update button states after reset
    this.updateButtonStates();
  }

  // ============================================================================
  // MATRIX OPERATION HANDLERS
  // ============================================================================

  /**
   * Handle matrix addition operation
   */
  handleAdd() {
    if (window.StatusService) {
      window.StatusService.setLoading();
    }

    const matrixConfig = this.appConfig.matrixMode || {};
    const maxMatrices = matrixConfig.maxMatrices || 1;

    if (maxMatrices < 2) {
      if (this.resultsPanel) {
        this.displayResult('Matrix B is not available. Enable maxMatrices >= 2 in config.');
      }
      if (window.StatusService) {
        window.StatusService.setReady();
      }
      return;
    }

    const result = this.operations.add(this.inputMatrixA, this.inputMatrixB);

    if (result && this.resultsPanel) {
      this.displayResult(...result.resultLines);
    }

    if (window.StatusService) {
      window.StatusService.setReady();
    }
  }

  /**
   * Handle scalar multiplication operation
   */
  handleScalarMultiply() {
    if (window.StatusService) {
      window.StatusService.setLoading();
    }

    const scalar = this.elements.matrixScalarInput
      ? parseFloat(this.elements.matrixScalarInput.value)
      : NaN;

    if (isNaN(scalar)) {
      if (this.resultsPanel) {
        this.displayResult('Please enter a valid scalar value.');
      }
      if (window.StatusService) {
        window.StatusService.setReady();
      }
      return;
    }

    const matrixLabel = this.dropdowns.matrixScalarSelect
      ? this.dropdowns.matrixScalarSelect.getValue()
      : 'A';

    const selectedMatrix = matrixLabel === 'A' ? this.inputMatrixA : this.inputMatrixB;
    const result = this.operations.scalarMultiply(selectedMatrix, scalar, matrixLabel);

    if (result && this.resultsPanel) {
      this.displayResult(...result.resultLines);
    }

    if (window.StatusService) {
      window.StatusService.setReady();
    }
  }

  /**
   * Handle matrix multiplication operation
   */
  handleMultiply() {
    if (window.StatusService) {
      window.StatusService.setLoading();
    }

    const matrixConfig = this.appConfig.matrixMode || {};
    const maxMatrices = matrixConfig.maxMatrices || 1;

    if (maxMatrices < 2) {
      if (this.resultsPanel) {
        this.displayResult('Matrix B is not available. Enable maxMatrices >= 2 in config.');
      }
      if (window.StatusService) {
        window.StatusService.setReady();
      }
      return;
    }

    const result = this.operations.multiply(this.inputMatrixA, this.inputMatrixB);

    if (result && this.resultsPanel) {
      this.displayResult(...result.resultLines);
    }

    if (window.StatusService) {
      window.StatusService.setReady();
    }
  }

  /**
   * Handle linear transformation Ax operation
   */
  handleComputeAx() {
    if (window.StatusService) {
      window.StatusService.setLoading();
    }

    const matrixConfig = this.appConfig.matrixMode || {};
    const includeVector = matrixConfig.includeVector || false;

    if (!includeVector) {
      if (this.resultsPanel) {
        this.displayResult('Vector v is not available. Enable includeVector in config.');
      }
      if (window.StatusService) {
        window.StatusService.setReady();
      }
      return;
    }

    const result = this.operations.transform(this.inputMatrixA, this.inputVector);

    if (result && result.resultVector) {
      // Set label and color for result vector
      result.resultVector.label = 'Ax';
      result.resultVector.color = this.styleConstants.colors.result;

      // Animate from input vector to transformed vector
      this.animateToResult(result.resultVector, () => {
        if (this.resultsPanel) {
          this.displayResult(...result.resultLines);
        }
        if (window.StatusService) {
          window.StatusService.setReady();
        }
      });
    } else {
      if (window.StatusService) {
        window.StatusService.setReady();
      }
    }
  }

  // ============================================================================
  // ANIMATION
  // ============================================================================

  /**
   * Animate result vector from input vector to target vector
   * @param {Vector} targetVector - Target vector to animate to
   * @param {Function} onComplete - Callback when animation completes
   */
  animateToResult(targetVector, onComplete) {
    this.isAnimating = true;
    // Always animate from input vector to transformed vector
    this.animationFrom = this.inputVector.clone();
    this.animationTo = targetVector;

    // Use Animator for animation loop
    this.animationControl = Animator.animate({
      duration: this.styleConstants.animationDuration,
      easingFunction: Animator.easeOutCubic,
      onFrame: (eased) => {
        // Use Animator.lerpVector for interpolation
        this.resultVector = Animator.lerpVector(this.animationFrom, this.animationTo, eased);
        this.render(); // Render canvas
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
   * Update button states based on matrix availability
   */
  updateButtonStates() {
    const matrixConfig = this.appConfig.matrixMode || {};
    const maxMatrices = matrixConfig.maxMatrices || 1;
    const includeVector = matrixConfig.includeVector || false;

    // If includeVector is true, treat as if maxMatrices == 1 (only matrix A available)
    const bothMatricesAvailable = includeVector ? false : (maxMatrices >= 2);

    // Two-matrix operations require both matrices (disabled when includeVector is true)
    if (this.elements.opMatrixAdd) {
      this.elements.opMatrixAdd.disabled = !bothMatricesAvailable;
    }
    if (this.elements.opMatrixMultiply) {
      this.elements.opMatrixMultiply.disabled = !bothMatricesAvailable;
    }

    // Scalar multiplication requires at least one matrix (always enabled)
    if (this.elements.opMatrixScale) {
      this.elements.opMatrixScale.disabled = false; // Always enabled if matrices exist
    }

    // Compute Ax requires includeVector to be true
    if (this.elements.opComputeAx) {
      this.elements.opComputeAx.disabled = !includeVector;
    }

    // Update scalar select dropdown based on effective matrix availability
    if (this.dropdowns.matrixScalarSelect) {
      const currentValue = this.dropdowns.matrixScalarSelect.getValue();
      // If B is selected but not available, switch to A
      if (!bothMatricesAvailable && currentValue === 'B') {
        this.dropdowns.matrixScalarSelect.setValue('A');
      }
      // Recreate dropdown with appropriate options
      this.updateMatrixScalarDropdown(bothMatricesAvailable);
    }
  }

  /**
   * Update determinant dropdown based on matrix B availability
   * @param {boolean} includeB - Whether to include matrix B option
   */
  updateDeterminantDropdown(includeB) {
    const dropdown = this.dropdowns.determinantMatrixSelect;
    if (!dropdown) return;

    // Filter items based on availability
    const availableItems = [{ value: 'A', label: 'A' }];
    if (includeB) {
      availableItems.push({ value: 'B', label: 'B' });
    }

    // Preserve current selection if still valid
    const currentValue = dropdown.getValue();
    const newValue = availableItems.some(item => item.value === currentValue)
      ? currentValue
      : 'A';

    // Get the container element
    const container = dropdown.container;

    // Destroy old dropdown
    dropdown.destroy();

    // Recreate with filtered items
    this.dropdowns.determinantMatrixSelect = new window.Dropdown(container, {
      items: availableItems,
      selectedValue: newValue,
      growToFit: true,
      onSelect: (value) => {
        this.selectedDeterminantMatrix = value;
        // If visualization is active, update it immediately
        if (this.showDeterminantArea) {
          this.updateDeterminantVisualization();
        }
      }
    });
  }

  /**
   * Update matrix scalar dropdown based on matrix B availability
   * @param {boolean} includeB - Whether to include matrix B option
   */
  updateMatrixScalarDropdown(includeB) {
    const dropdown = this.dropdowns.matrixScalarSelect;
    if (!dropdown) return;

    // Filter items based on availability
    const availableItems = [{ value: 'A', label: 'A' }];
    if (includeB) {
      availableItems.push({ value: 'B', label: 'B' });
    }

    // Preserve current selection if still valid
    const currentValue = dropdown.getValue();
    const newValue = availableItems.some(item => item.value === currentValue)
      ? currentValue
      : 'A';

    // Get the container element
    const container = dropdown.container;

    // Destroy old dropdown
    dropdown.destroy();

    // Recreate with filtered items
    this.dropdowns.matrixScalarSelect = new window.Dropdown(container, {
      items: availableItems,
      selectedValue: newValue,
      growToFit: true
    });
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

    // Draw matrix B column vectors (î_B and ĵ_B) or vector v based on configuration
    const matrixConfig = this.appConfig.matrixMode || {};
    const maxMatrices = matrixConfig.maxMatrices || 1;
    const includeVector = matrixConfig.includeVector || false;

    // Declare matrix B vectors outside the conditional block so they're accessible for determinant visualization
    let matrixBI = null;
    let matrixBJ = null;

    if (includeVector) {
      // Draw input vector v when includeVector is true
      this.drawVector(this.inputVector, false, 1, false, null, null);

      // Draw result vector if it exists (from Ax transformation)
      // Use dashed line to distinguish from input vector
      if (this.resultVector) {
        this.drawVector(this.resultVector, true, 1, false, null, null);
      }
    } else if (maxMatrices >= 2) {
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
      } else if (this.selectedDeterminantMatrix === 'B' && !includeVector && maxMatrices >= 2 && matrixBI && matrixBJ) {
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
   * Get matrix column vectors for collision detection
   * @returns {Array<Vector>} Array of matrix column vectors
   */
  getMatrixVectors() {
    const vectors = [];

    // Add matrix A column vectors
    if (this.inputMatrixA) {
      vectors.push(new Vector(
        this.inputMatrixA.get(0, 0),
        this.inputMatrixA.get(1, 0),
        this.styleConstants.colors.matrixBasisI || '#ef4444',
        'î'
      ));
      vectors.push(new Vector(
        this.inputMatrixA.get(0, 1),
        this.inputMatrixA.get(1, 1),
        this.styleConstants.colors.matrixBasisJ || '#3b82f6',
        'ĵ'
      ));
    }

    // Add matrix B column vectors if enabled
    const matrixConfig = this.appConfig.matrixMode || {};
    const maxMatrices = matrixConfig.maxMatrices || 1;
    if (maxMatrices > 1 && this.inputMatrixB) {
      vectors.push(new Vector(
        this.inputMatrixB.get(0, 0),
        this.inputMatrixB.get(1, 0),
        '#10b981',
        'î_B'
      ));
      vectors.push(new Vector(
        this.inputMatrixB.get(0, 1),
        this.inputMatrixB.get(1, 1),
        '#8b5cf6',
        'ĵ_B'
      ));
    }

    // Add input vector if enabled
    const includeVector = matrixConfig.includeVector || false;
    if (includeVector && this.inputVector) {
      vectors.push(this.inputVector);
    }

    // Add result vector if present
    if (this.resultVector) {
      vectors.push(this.resultVector);
    }

    return vectors;
  }

  /**
   * Clean up resources when mode is destroyed
   */
  destroy() {
    // Cancel any running animations
    if (this.animationControl) {
      this.animationControl.cancel();
      this.animationControl = null;
    }

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

    // Destroy all dropdowns
    if (this.dropdowns) {
      Object.values(this.dropdowns).forEach(dropdown => {
        if (dropdown && typeof dropdown.destroy === 'function') {
          dropdown.destroy();
        }
      });
      this.dropdowns = {};
    }

    // Clear state
    this.inputMatrixA = null;
    this.inputMatrixB = null;
    this.basisVectors = null;
    this.showDeterminantArea = false;
    this.resultVector = null;
  }
}
