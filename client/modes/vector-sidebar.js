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

      // Inputs
      scalarInput: this.root.querySelector('#scalar-input'),
      lcScalarA: this.root.querySelector('#lc-scalar-a'),
      lcScalarB: this.root.querySelector('#lc-scalar-b'),

      // Other elements
      vector2Control: this.root.querySelector('#vector2-control')
    };

    // Initialize ResultsPanel for result display
    const resultsElement = this.root.querySelector('#vector-results');
    this.resultsPanel = resultsElement ? new ResultsPanel(resultsElement) : null;

    // Event listener references for cleanup
    this.eventListeners = [];

    // Initialize dropdowns
    this.dropdowns = {};
    this.initializeDropdowns();
  }

  /**
   * Initialize all dropdown components
   */
  initializeDropdowns() {
    // Coordinate mode dropdown
    const coordModeContainer = this.root.querySelector('#coord-mode-dropdown');
    if (coordModeContainer && window.Dropdown) {
      this.dropdowns.coordMode = new window.Dropdown(coordModeContainer, {
        items: [
          { value: 'cartesian', label: 'Cartesian' },
          { value: 'polar', label: 'Polar' }
        ],
        selectedValue: 'cartesian',
        growToFit: true
      });
    }

    // Reflection type dropdowns
    const reflectTypeV1Container = this.root.querySelector('#reflect-type-v1-dropdown');
    if (reflectTypeV1Container && window.Dropdown) {
      this.dropdowns.reflectTypeV1 = new window.Dropdown(reflectTypeV1Container, {
        items: [
          { value: 'x-axis', label: 'X-axis' },
          { value: 'y-axis', label: 'Y-axis' },
          { value: 'diagonal', label: 'Diagonal (y=x)' }
        ],
        selectedValue: 'x-axis',
        growToFit: true
      });
    }

    const reflectTypeV2Container = this.root.querySelector('#reflect-type-v2-dropdown');
    if (reflectTypeV2Container && window.Dropdown) {
      this.dropdowns.reflectTypeV2 = new window.Dropdown(reflectTypeV2Container, {
        items: [
          { value: 'x-axis', label: 'X-axis' },
          { value: 'y-axis', label: 'Y-axis' },
          { value: 'diagonal', label: 'Diagonal (y=x)' }
        ],
        selectedValue: 'x-axis',
        growToFit: true
      });
    }

    // Vector selection dropdowns
    const scaleVectorContainer = this.root.querySelector('#scale-vector-dropdown');
    if (scaleVectorContainer && window.Dropdown) {
      this.dropdowns.scaleVectorSelect = new window.Dropdown(scaleVectorContainer, {
        items: [
          { value: 'v1', label: 'v1' },
          { value: 'v2', label: 'v2' }
        ],
        selectedValue: 'v1',
        growToFit: true
      });
    }

    const normalizeVectorContainer = this.root.querySelector('#normalize-vector-dropdown');
    if (normalizeVectorContainer && window.Dropdown) {
      this.dropdowns.normalizeVectorSelect = new window.Dropdown(normalizeVectorContainer, {
        items: [
          { value: 'v1', label: 'v1' },
          { value: 'v2', label: 'v2' }
        ],
        selectedValue: 'v1',
        growToFit: true
      });
    }

    const perpendicularVectorContainer = this.root.querySelector('#perpendicular-vector-dropdown');
    if (perpendicularVectorContainer && window.Dropdown) {
      this.dropdowns.perpendicularVectorSelect = new window.Dropdown(perpendicularVectorContainer, {
        items: [
          { value: 'v1', label: 'v1' },
          { value: 'v2', label: 'v2' }
        ],
        selectedValue: 'v1',
        growToFit: true
      });
    }
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

    // Coordinate mode dropdown
    if (this.dropdowns.coordMode && handlers.onCoordModeChange) {
      // Store handler reference for later use
      this.coordModeChangeHandler = handlers.onCoordModeChange;
      // Update dropdown config with onSelect callback
      if (this.dropdowns.coordMode.config) {
        this.dropdowns.coordMode.config.onSelect = (value) => {
          // Create a synthetic event-like object for compatibility
          if (this.coordModeChangeHandler) {
            this.coordModeChangeHandler({ target: { value } });
          }
        };
      }
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
        const value = this.dropdowns.scaleVectorSelect ? this.dropdowns.scaleVectorSelect.getValue() : 'v1';
        const vectorNum = value === 'v1' ? 1 : 2;
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
        const value = this.dropdowns.normalizeVectorSelect ? this.dropdowns.normalizeVectorSelect.getValue() : 'v1';
        const vectorNum = value === 'v1' ? 1 : 2;
        handlers.onNormalize(vectorNum);
      };
      this.elements.opNormalize.addEventListener('click', handler);
      this.eventListeners.push({ element: this.elements.opNormalize, event: 'click', handler });
    }

    if (this.elements.opPerpendicular && handlers.onPerpendicular) {
      const handler = () => {
        const value = this.dropdowns.perpendicularVectorSelect ? this.dropdowns.perpendicularVectorSelect.getValue() : 'v1';
        const vectorNum = value === 'v1' ? 1 : 2;
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
    // Recreate dropdowns with filtered items based on vector availability
    this.updateVectorSelectDropdown('scaleVectorSelect', v1Exists, v2Exists);
    this.updateVectorSelectDropdown('normalizeVectorSelect', v1Exists, v2Exists);
    this.updateVectorSelectDropdown('perpendicularVectorSelect', v1Exists, v2Exists);
  }

  /**
   * Update a vector select dropdown based on vector availability
   * @param {string} dropdownKey - Key in this.dropdowns object
   * @param {boolean} v1Exists - Whether vector 1 exists
   * @param {boolean} v2Exists - Whether vector 2 exists
   */
  updateVectorSelectDropdown(dropdownKey, v1Exists, v2Exists) {
    const dropdown = this.dropdowns[dropdownKey];
    if (!dropdown) return;

    // Filter items based on availability
    const availableItems = [];
    if (v1Exists) availableItems.push({ value: 'v1', label: 'v1' });
    if (v2Exists) availableItems.push({ value: 'v2', label: 'v2' });

    if (availableItems.length === 0) return;

    // Preserve current selection if still valid
    const currentValue = dropdown.getValue();
    const newValue = availableItems.some(item => item.value === currentValue)
      ? currentValue
      : availableItems[0].value;

    // Get the container element
    const container = dropdown.container;

    // Destroy old dropdown
    dropdown.destroy();

    // Recreate with filtered items
    const onSelectHandler = dropdown.config.onSelect;
    this.dropdowns[dropdownKey] = new window.Dropdown(container, {
      items: availableItems,
      selectedValue: newValue,
      growToFit: true,
      onSelect: onSelectHandler
    });
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
    const dropdown = vectorNum === 1 ? this.dropdowns.reflectTypeV1 : this.dropdowns.reflectTypeV2;
    return dropdown ? dropdown.getValue() : 'x-axis';
  }

  /**
   * Get coordinate mode
   * @returns {string} 'cartesian' or 'polar'
   */
  getCoordinateMode() {
    return this.dropdowns.coordMode ? this.dropdowns.coordMode.getValue() : 'cartesian';
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

    // Destroy all dropdowns
    if (this.dropdowns) {
      Object.values(this.dropdowns).forEach(dropdown => {
        if (dropdown && typeof dropdown.destroy === 'function') {
          dropdown.destroy();
        }
      });
      this.dropdowns = {};
    }
  }
}

