/**
 * Mode Manager
 * Handles mode visibility and switching between vector and matrix modes
 */

(function() {
  class ModeManager {
    constructor() {
      this.vectorContent = document.querySelector('.mode-content[data-mode="vector"]');
      this.matrixContent = document.querySelector('.mode-content[data-mode="matrix"]');
      this.currentMode = null;
    }

    /**
     * Show vector mode and hide matrix mode
     */
    showVectorMode() {
      if (this.matrixContent) {
        this.matrixContent.classList.remove('active');
        this.matrixContent.classList.add('hidden');
      }
      if (this.vectorContent) {
        this.vectorContent.classList.remove('hidden');
        this.vectorContent.classList.add('active');
      }
      this.currentMode = 'vector';
    }

    /**
     * Show matrix mode and hide vector mode
     */
    showMatrixMode() {
      if (this.vectorContent) {
        this.vectorContent.classList.remove('active');
        this.vectorContent.classList.add('hidden');
      }
      if (this.matrixContent) {
        this.matrixContent.classList.remove('hidden');
        this.matrixContent.classList.add('active');
      }
      this.currentMode = 'matrix';
    }

    /**
     * Get the current active mode
     * @returns {string|null} 'vector', 'matrix', or null
     */
    getCurrentMode() {
      return this.currentMode;
    }

    /**
     * Get the results container for the current mode
     * @returns {HTMLElement|null} Results container element or null
     */
    getResultsContainer() {
      if (this.currentMode === 'vector') {
        return document.getElementById('vector-results');
      } else if (this.currentMode === 'matrix') {
        return document.getElementById('matrix-results');
      }
      return null;
    }
  }

  // Export singleton instance
  window.ModeManager = new ModeManager();
})();

