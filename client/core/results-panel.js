/**
 * Results Panel Class
 * Reusable component for displaying operation results in both vector and matrix modes
 * Handles formatted result display with consistent markup, collapse functionality, and smart positioning
 */

class ResultsPanel {
  /**
   * Create a ResultsPanel instance
   * @param {HTMLElement|string} rootElement - Root element or selector for results container
   * @param {Object} options - Options object
   * @param {string} [options.emptyMessage] - Message to display when panel is empty
   * @param {HTMLElement} [options.canvasContainer] - Canvas container for position calculation
   * @param {Object} [options.coordSystem] - Coordinate system for position calculation
   * @param {Object} [options.modeInstance] - Mode instance for collecting canvas objects
   */
  constructor(rootElement, options = {}) {
    // Find root element
    if (typeof rootElement === 'string') {
      this.root = document.querySelector(rootElement);
    } else {
      this.root = rootElement;
    }

    if (!this.root) {
      console.warn('ResultsPanel: root element not found');
      return;
    }

    // Initialize from options object
    this.emptyMessage = options.emptyMessage || 'Perform an operation to see results';
    this.canvasContainer = options.canvasContainer || null;
    this.coordSystem = options.coordSystem || null;
    this.modeInstance = options.modeInstance || null;

    // State properties
    this.isCollapsed = false;
    this.currentPosition = 'top-left'; // default position

    // Find child elements
    this.contentElement = this.root.querySelector('.results-content');
    this.collapseButton = this.root.querySelector('.results-collapse');

    // Set up event listeners
    this._setupEventListeners();

    // Initialize with empty state
    this.clear();

    // Apply initial position
    this.applyPosition('top-left');
  }

  /**
   * Set up event listeners for collapse button and window resize
   * @private
   */
  _setupEventListeners() {
    if (this.collapseButton) {
      this.collapseButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCollapse();
      });
    }

    // When collapsed, clicking the badge expands it
    if (this.root) {
      this.root.addEventListener('click', (e) => {
        if (this.isCollapsed && e.target === this.root) {
          this.toggleCollapse();
        }
      });
    }

    // Set up window resize handler with debouncing
    if (this.canvasContainer && this.coordSystem && this.modeInstance) {
      this._resizeHandler = this._debounce(() => {
        if (!this.isCollapsed) {
          this.calculateOptimalPosition();
        }
      }, 250);
      window.addEventListener('resize', this._resizeHandler);
    }
  }

  /**
   * Display result lines in the panel
   * @param {...string} lines - One or more lines to display (can contain HTML)
   */
  show(...lines) {
    if (!this.contentElement) return;

    if (lines.length === 0) {
      this.clear();
      return;
    }

    this.contentElement.innerHTML = lines.map(line =>
      `<p class="formula">${line}</p>`
    ).join('');

    // Calculate optimal position after showing results
    if (this.canvasContainer && this.coordSystem && this.modeInstance) {
      this._debouncedReposition();
    }
  }

  /**
   * Clear the results panel
   */
  clear() {
    if (!this.contentElement) return;

    this.contentElement.innerHTML = `<p class="hint">${this.emptyMessage}</p>`;
  }

  /**
   * Toggle collapse state
   */
  toggleCollapse() {
    if (!this.root) return;

    this.isCollapsed = !this.isCollapsed;

    if (this.isCollapsed) {
      this.root.classList.add('collapsed');
    } else {
      this.root.classList.remove('collapsed');
      // Recalculate position when expanding
      if (this.canvasContainer && this.coordSystem && this.modeInstance) {
        this.calculateOptimalPosition();
      }
    }
  }

  /**
   * Apply position to the panel
   * @param {string} position - One of: 'top-left', 'top-right', 'bottom-left', 'bottom-right'
   */
  applyPosition(position) {
    if (!this.root) return;

    // Remove all position classes
    this.root.classList.remove('pos-top-left', 'pos-top-right', 'pos-bottom-left', 'pos-bottom-right');

    // Add new position class
    this.root.classList.add(`pos-${position}`);
    this.currentPosition = position;
  }

  /**
   * Debounced reposition (will be implemented in next step)
   * @private
   */
  _debouncedReposition() {
    if (!this._repositionDebounce) {
      this._repositionDebounce = this._debounce(() => {
        this.calculateOptimalPosition();
      }, 250);
    }
    this._repositionDebounce();
  }

  /**
   * Collect canvas objects (vectors/matrices) from mode instance
   * @returns {Array<{x: number, y: number}>} Array of math coordinates
   * @private
   */
  _collectCanvasObjects() {
    if (!this.modeInstance) return [];

    const objects = [];

    // Try to get vectors from vector mode
    if (typeof this.modeInstance.getVectors === 'function') {
      const vectors = this.modeInstance.getVectors();
      vectors.forEach(v => {
        if (v && typeof v.x === 'number' && typeof v.y === 'number') {
          objects.push({ x: v.x, y: v.y });
        }
      });
    }

    // Try to get matrix vectors from matrix mode
    if (typeof this.modeInstance.getMatrixVectors === 'function') {
      const matrixVectors = this.modeInstance.getMatrixVectors();
      matrixVectors.forEach(v => {
        if (v && typeof v.x === 'number' && typeof v.y === 'number') {
          objects.push({ x: v.x, y: v.y });
        }
      });
    }

    return objects;
  }

  /**
   * Score a corner position based on occlusion penalty
   * @param {string} corner - Corner name: 'top-left', 'top-right', 'bottom-left', 'bottom-right'
   * @param {Array<{x: number, y: number}>} screenObjects - Array of screen coordinates
   * @returns {number} Penalty score (lower is better)
   * @private
   */
  _scoreCornerPosition(corner, screenObjects) {
    if (!this.canvasContainer) return Infinity;

    const containerRect = this.canvasContainer.getBoundingClientRect();
    const panelWidth = this.isCollapsed ? 60 : 300;
    const panelHeight = this.isCollapsed ? 60 : 400;
    const margin = 20;

    // Calculate panel rectangle for this corner
    let panelRect;
    switch (corner) {
      case 'top-left':
        panelRect = {
          left: margin,
          top: margin,
          right: margin + panelWidth,
          bottom: margin + panelHeight
        };
        break;
      case 'top-right':
        panelRect = {
          left: containerRect.width - margin - panelWidth,
          top: margin,
          right: containerRect.width - margin,
          bottom: margin + panelHeight
        };
        break;
      case 'bottom-left':
        panelRect = {
          left: margin,
          top: containerRect.height - margin - panelHeight,
          right: margin + panelWidth,
          bottom: containerRect.height - margin
        };
        break;
      case 'bottom-right':
        panelRect = {
          left: containerRect.width - margin - panelWidth,
          top: containerRect.height - margin - panelHeight,
          right: containerRect.width - margin,
          bottom: containerRect.height - margin
        };
        break;
      default:
        return Infinity;
    }

    // Calculate panel center
    const panelCenterX = (panelRect.left + panelRect.right) / 2;
    const panelCenterY = (panelRect.top + panelRect.bottom) / 2;

    // Calculate penalty for each object
    let totalPenalty = 0;
    for (const obj of screenObjects) {
      // Distance from object to panel center
      const dx = obj.x - panelCenterX;
      const dy = obj.y - panelCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if object is inside panel bounds
      const isInside = obj.x >= panelRect.left && obj.x <= panelRect.right &&
                       obj.y >= panelRect.top && obj.y <= panelRect.bottom;

      if (isInside) {
        // Heavy penalty for objects inside panel
        totalPenalty += 300;
      } else {
        // Distance-based penalty (closer = higher penalty)
        totalPenalty += Math.max(0, 200 - distance);
      }
    }

    return totalPenalty;
  }

  /**
   * Calculate optimal position to avoid canvas objects
   */
  calculateOptimalPosition() {
    // If no coordination system or mode instance, use default
    if (!this.coordSystem || !this.modeInstance || !this.canvasContainer) {
      this.applyPosition('top-left');
      return;
    }

    // Collect canvas objects in math coordinates
    const mathObjects = this._collectCanvasObjects();

    // If no objects, use default position
    if (mathObjects.length === 0) {
      this.applyPosition('top-left');
      return;
    }

    // Convert math coordinates to screen coordinates
    const screenObjects = mathObjects.map(obj => {
      const screenCoords = this.coordSystem.mathToScreen(obj.x, obj.y);
      return {
        x: screenCoords.x,
        y: screenCoords.y
      };
    });

    // Score each corner
    const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const scores = corners.map(corner => ({
      corner,
      penalty: this._scoreCornerPosition(corner, screenObjects)
    }));

    // Find corner with lowest penalty
    scores.sort((a, b) => a.penalty - b.penalty);
    const optimalCorner = scores[0].corner;

    // Apply the optimal position
    this.applyPosition(optimalCorner);
  }

  /**
   * Utility: Debounce function
   * @private
   */
  _debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Get the root element
   * @returns {HTMLElement|null}
   */
  getRoot() {
    return this.root;
  }

  /**
   * Cleanup method to remove event listeners
   */
  destroy() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
  }
}
