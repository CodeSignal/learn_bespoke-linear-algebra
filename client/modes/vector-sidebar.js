/**
 * VectorSidebar Class
 * Manages all DOM interactions and UI state for the vector mode sidebar
 * Caches DOM elements for performance and provides event-driven UI updates
 */

class VectorSidebar {
  constructor(rootElement) {
    this.root = rootElement;

    // Cache all DOM element references once
    this.elements = {
      // Vector info displays
      v1Coords: this.root.querySelector('#v1-coords'),
      v1Magnitude: this.root.querySelector('#v1-magnitude'),
      v2Coords: this.root.querySelector('#v2-coords'),
      v2Magnitude: this.root.querySelector('#v2-magnitude'),

      // Control buttons
      canvasReset: this.root.querySelector('#canvas-reset'),
      coordMode: this.root.querySelector('#coord-mode'),

      // Operation buttons
      opAdd: this.root.querySelector('#op-add'),
      opSubtract: this.root.querySelector('#op-subtract'),
      opScale: this.root.querySelector('#op-scale'),
      opDot: this.root.querySelector('#op-dot'),
      opProject: this.root.querySelector('#op-project'),
      opAngle: this.root.querySelector('#op-angle'),
      opNormalize: this.root.querySelector('#op-normalize'),
      opPerpendicular: this.root.querySelector('#op-perpendicular'),
      opReflectV1: this.root.querySelector('#op-reflect-v1'),
      opReflectV2: this.root.querySelector('#op-reflect-v2'),
      opLinearCombo: this.root.querySelector('#op-linear-combo'),

      // Selects and inputs
      scaleVectorSelect: this.root.querySelector('#scale-vector-select'),
      normalizeVectorSelect: this.root.querySelector('#normalize-vector-select'),
      perpendicularVectorSelect: this.root.querySelector('#perpendicular-vector-select'),
      scalarInput: this.root.querySelector('#scalar-input'),
      lcScalarA: this.root.querySelector('#lc-scalar-a'),
      lcScalarB: this.root.querySelector('#lc-scalar-b'),
      reflectTypeV1: this.root.querySelector('#reflect-type-v1'),
      reflectTypeV2: this.root.querySelector('#reflect-type-v2'),

      // Other elements
      vector2Control: this.root.querySelector('#vector2-control')
    };

    // Initialize ResultsPanel for result display
    const resultsElement = this.root.querySelector('#vector-results');
    this.resultsPanel = resultsElement ? new ResultsPanel(resultsElement) : null;

    // Event listener references for cleanup
    this.eventListeners = [];
  }

  /**
   * Set up event listeners with handlers provided by VectorMode
   * @param {Object} handlers - Object with handler functions
   */
  setupEventListeners(handlers) {
    // Canvas reset button
    if (this.elements.canvasReset && handlers.onClearAll) {
      const handler = handlers.onClearAll;
      this.elements.canvasReset.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.canvasReset, event: 'click', handler });
    }

    // Coordinate mode toggle
    if (this.elements.coordMode && handlers.onCoordModeChange) {
      const handler = handlers.onCoordModeChange;
      this.elements.coordMode.addEventListener('change', handler);
      this.eventListeners.push({ element: this.elements.coordMode, event: 'change', handler });
    }

    // Operation buttons
    if (this.elements.opAdd && handlers.onAdd) {
      const handler = handlers.onAdd;
      this.elements.opAdd.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opAdd, event: 'click', handler });
    }

    if (this.elements.opSubtract && handlers.onSubtract) {
      const handler = handlers.onSubtract;
      this.elements.opSubtract.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opSubtract, event: 'click', handler });
    }

    if (this.elements.opScale && handlers.onScale) {
      const handler = () => {
        const vectorNum = this.elements.scaleVectorSelect.value === 'v1' ? 1 : 2;
        handlers.onScale(vectorNum);
      };
      this.elements.opScale.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opScale, event: 'click', handler });
    }

    if (this.elements.opDot && handlers.onDot) {
      const handler = handlers.onDot;
      this.elements.opDot.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opDot, event: 'click', handler });
    }

    if (this.elements.opProject && handlers.onProject) {
      const handler = handlers.onProject;
      this.elements.opProject.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opProject, event: 'click', handler });
    }

    if (this.elements.opAngle && handlers.onAngle) {
      const handler = handlers.onAngle;
      this.elements.opAngle.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opAngle, event: 'click', handler });
    }

    if (this.elements.opNormalize && handlers.onNormalize) {
      const handler = () => {
        const vectorNum = this.elements.normalizeVectorSelect.value === 'v1' ? 1 : 2;
        handlers.onNormalize(vectorNum);
      };
      this.elements.opNormalize.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opNormalize, event: 'click', handler });
    }

    if (this.elements.opPerpendicular && handlers.onPerpendicular) {
      const handler = () => {
        const vectorNum = this.elements.perpendicularVectorSelect.value === 'v1' ? 1 : 2;
        handlers.onPerpendicular(vectorNum);
      };
      this.elements.opPerpendicular.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opPerpendicular, event: 'click', handler });
    }

    if (this.elements.opReflectV1 && handlers.onReflectV1) {
      const handler = handlers.onReflectV1;
      this.elements.opReflectV1.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opReflectV1, event: 'click', handler });
    }

    if (this.elements.opReflectV2 && handlers.onReflectV2) {
      const handler = handlers.onReflectV2;
      this.elements.opReflectV2.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opReflectV2, event: 'click', handler });
    }

    if (this.elements.opLinearCombo && handlers.onLinearCombo) {
      const handler = handlers.onLinearCombo;
      this.elements.opLinearCombo.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opLinearCombo, event: 'click', handler });
    }

    // Linear combination scalar inputs
    if (this.elements.lcScalarA && handlers.onLinearComboInputChange) {
      const handler = handlers.onLinearComboInputChange;
      this.elements.lcScalarA.addEventListener('input', handler);
      this.eventListeners.push({ element: this.elements.lcScalarA, event: 'input', handler });
    }

    if (this.elements.lcScalarB && handlers.onLinearComboInputChange) {
      const handler = handlers.onLinearComboInputChange;
      this.elements.lcScalarB.addEventListener('input', handler);
      this.eventListeners.push({ element: this.elements.lcScalarB, event: 'input', handler });
    }
  }

  /**
   * Update vector information display
   * @param {Vector|null} vector1 - First vector or null
   * @param {Vector|null} vector2 - Second vector or null
   * @param {string} coordinateMode - 'cartesian' or 'polar'
   */
  updateVectorInfo(vector1, vector2, coordinateMode) {
    // Update Vector 1
    if (this.elements.v1Coords && this.elements.v1Magnitude) {
      if (vector1) {
        this.elements.v1Coords.textContent = vector1.formatCoordinates(coordinateMode);
        this.elements.v1Magnitude.textContent = vector1.magnitude().toFixed(2);
      } else {
        this.elements.v1Coords.textContent = 'Not created';
        this.elements.v1Magnitude.textContent = '—';
      }
    }

    // Update Vector 2
    if (this.elements.v2Coords && this.elements.v2Magnitude) {
      if (vector2) {
        this.elements.v2Coords.textContent = vector2.formatCoordinates(coordinateMode);
        this.elements.v2Magnitude.textContent = vector2.magnitude().toFixed(2);
      } else {
        this.elements.v2Coords.textContent = 'Not created';
        this.elements.v2Magnitude.textContent = '—';
      }
    }
  }

  /**
   * Update button states based on vector availability
   * @param {Vector|null} vector1 - First vector or null
   * @param {Vector|null} vector2 - Second vector or null
   */
  updateButtonStates(vector1, vector2) {
    const bothExist = vector1 && vector2;
    const v1Exists = !!vector1;
    const v2Exists = !!vector2;
    const anyVectorExists = v1Exists || v2Exists;

    // Two-vector operations
    if (this.elements.opAdd) this.elements.opAdd.disabled = !bothExist;
    if (this.elements.opSubtract) this.elements.opSubtract.disabled = !bothExist;
    if (this.elements.opDot) this.elements.opDot.disabled = !bothExist;
    if (this.elements.opProject) this.elements.opProject.disabled = !bothExist;
    if (this.elements.opAngle) this.elements.opAngle.disabled = !bothExist;
    if (this.elements.opLinearCombo) this.elements.opLinearCombo.disabled = !bothExist;

    // Single-vector operations
    if (this.elements.opScale) this.elements.opScale.disabled = !anyVectorExists;
    if (this.elements.opNormalize) this.elements.opNormalize.disabled = !anyVectorExists;
    if (this.elements.opPerpendicular) this.elements.opPerpendicular.disabled = !anyVectorExists;

    // Reflection operations
    if (this.elements.opReflectV1) this.elements.opReflectV1.disabled = !v1Exists;
    if (this.elements.opReflectV2) this.elements.opReflectV2.disabled = !v2Exists;

    // Manage dropdowns for single-vector operations
    if (this.elements.scaleVectorSelect) {
      const v1Option = this.elements.scaleVectorSelect.querySelector('option[value="v1"]');
      const v2Option = this.elements.scaleVectorSelect.querySelector('option[value="v2"]');
      if (v1Option) v1Option.disabled = !v1Exists;
      if (v2Option) v2Option.disabled = !v2Exists;

      // Auto-select available vector
      if (v1Exists && !v2Exists) {
        this.elements.scaleVectorSelect.value = 'v1';
      } else if (!v1Exists && v2Exists) {
        this.elements.scaleVectorSelect.value = 'v2';
      }
    }

    if (this.elements.normalizeVectorSelect) {
      const v1Option = this.elements.normalizeVectorSelect.querySelector('option[value="v1"]');
      const v2Option = this.elements.normalizeVectorSelect.querySelector('option[value="v2"]');
      if (v1Option) v1Option.disabled = !v1Exists;
      if (v2Option) v2Option.disabled = !v2Exists;

      // Auto-select available vector
      if (v1Exists && !v2Exists) {
        this.elements.normalizeVectorSelect.value = 'v1';
      } else if (!v1Exists && v2Exists) {
        this.elements.normalizeVectorSelect.value = 'v2';
      }
    }

    if (this.elements.perpendicularVectorSelect) {
      const v1Option = this.elements.perpendicularVectorSelect.querySelector('option[value="v1"]');
      const v2Option = this.elements.perpendicularVectorSelect.querySelector('option[value="v2"]');
      if (v1Option) v1Option.disabled = !v1Exists;
      if (v2Option) v2Option.disabled = !v2Exists;

      // Auto-select available vector
      if (v1Exists && !v2Exists) {
        this.elements.perpendicularVectorSelect.value = 'v1';
      } else if (!v1Exists && v2Exists) {
        this.elements.perpendicularVectorSelect.value = 'v2';
      }
    }
  }

  /**
   * Update operation group visibility based on configuration
   * @param {Object} appConfig - Application configuration object with vectorMode.operationGroups and vectorMode.maxVectors
   */
  updateOperationGroupVisibility(appConfig) {
    const vectorConfig = appConfig.vectorMode || {};
    const operationGroups = vectorConfig.operationGroups || {};
    const maxVectors = vectorConfig.maxVectors || 2;

    const shouldShowGroup = (groupName) => {
      // First check if the operation group is enabled in configuration
      if (operationGroups[groupName] === false) {
        return false;
      }

      // Hide operations that require 2 vectors when maxVectors < 2
      const twoVectorOperations = ['addition', 'dotProduct', 'projectionAngle'];
      if (twoVectorOperations.includes(groupName) && maxVectors < 2) {
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

    // Show/hide vector panels based on maxVectors configuration
    if (this.elements.vector2Control) {
      if (maxVectors >= 2) {
        this.elements.vector2Control.style.display = '';
      } else {
        this.elements.vector2Control.style.display = 'none';
      }
    }
  }

  /**
   * Update linear combination button text
   */
  updateLinearComboButton() {
    if (!this.elements.opLinearCombo || !this.elements.lcScalarA || !this.elements.lcScalarB) {
      return;
    }

    const scalarA = parseFloat(this.elements.lcScalarA.value) || 0;
    const scalarB = parseFloat(this.elements.lcScalarB.value) || 0;

    // Format the button text with proper signs
    const aText = scalarA === 1 ? '' : scalarA === -1 ? '-' : scalarA;
    const bText = scalarB >= 0 ? ` + ${scalarB === 1 ? '' : scalarB}` : ` - ${Math.abs(scalarB) === 1 ? '' : Math.abs(scalarB)}`;

    this.elements.opLinearCombo.textContent = `${aText}v₁${bText}v₂`;
  }

  /**
   * Display result lines in the results panel
   * @param {...string} lines - One or more lines to display
   */
  displayResult(...lines) {
    if (this.resultsPanel) {
      this.resultsPanel.show(...lines);
    }
  }

  /**
   * Clear the results panel
   */
  clearResults() {
    if (this.resultsPanel) {
      this.resultsPanel.clear();
    }
  }

  /**
   * Get scalar input value
   * @returns {number} Scalar value or NaN
   */
  getScalarInput() {
    if (!this.elements.scalarInput) return NaN;
    return parseFloat(this.elements.scalarInput.value);
  }

  /**
   * Get linear combination scalar values
   * @returns {Object} Object with scalarA and scalarB
   */
  getLinearComboScalars() {
    const scalarA = this.elements.lcScalarA ? parseFloat(this.elements.lcScalarA.value) : NaN;
    const scalarB = this.elements.lcScalarB ? parseFloat(this.elements.lcScalarB.value) : NaN;
    return { scalarA, scalarB };
  }

  /**
   * Get reflection type for a vector
   * @param {number} vectorNum - 1 or 2
   * @returns {string} Reflection type ('x-axis', 'y-axis', 'diagonal')
   */
  getReflectionType(vectorNum) {
    const select = vectorNum === 1 ? this.elements.reflectTypeV1 : this.elements.reflectTypeV2;
    return select ? select.value : 'x-axis';
  }

  /**
   * Get coordinate mode
   * @returns {string} 'cartesian' or 'polar'
   */
  getCoordinateMode() {
    return this.elements.coordMode ? this.elements.coordMode.value : 'cartesian';
  }

  /**
   * Clean up all event listeners
   */
  destroy() {
    if (this.eventListeners) {
      this.eventListeners.forEach(({ element, event, handler }) => {
        if (element && typeof element.removeEventListener === 'function') {
          element.removeEventListener(event, handler);
        }
      });
      this.eventListeners = [];
    }
  }
}

