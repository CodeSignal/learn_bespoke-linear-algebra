/**
 * Mode Manager
 * Lifecycle controller for managing vector and matrix modes
 * Owns shared resources (CoordinateSystem) and handles mode instantiation/teardown
 */

(function() {
  class ModeManager {
    constructor() {
      this.vectorContent = document.querySelector('.mode-content[data-mode="vector"]');
      this.matrixContent = document.querySelector('.mode-content[data-mode="matrix"]');
      this.currentMode = null;
      this.currentModeInstance = null;
      this.modes = {}; // Registry of mode factories
      this.coordSystem = null; // Shared CoordinateSystem instance
    }

    /**
     * Initialize the shared CoordinateSystem
     * Should be called once before registering modes
     * @param {Object} styleConstants - Style constants object
     */
    initializeCoordinateSystem(styleConstants) {
      if (this.coordSystem) {
        return this.coordSystem;
      }

      const canvas = document.getElementById('grid-canvas');
      if (!canvas) {
        console.error('Canvas element not found');
        return null;
      }

      // Load colors from CSS with styleConstants as fallbacks
      const colors = window.ColorUtils
        ? window.ColorUtils.getColorsFromCSS(styleConstants)
        : {};

      this.coordSystem = new CoordinateSystem(canvas, colors, styleConstants);
      return this.coordSystem;
    }

    /**
     * Get the shared CoordinateSystem instance
     * @returns {CoordinateSystem|null}
     */
    getCoordinateSystem() {
      return this.coordSystem;
    }

    /**
     * Register a mode factory
     * @param {string} name - Mode name ('vector' or 'matrix')
     * @param {Function} factory - Factory function that returns a mode instance
     *                               The instance should have a destroy() method
     */
    registerMode(name, factory) {
      this.modes[name] = factory;
    }

    /**
     * Set the active mode
     * Handles teardown of current mode and instantiation of new mode
     * @param {string} modeName - Mode name ('vector' or 'matrix')
     */
    setMode(modeName) {
      if (!this.modes[modeName]) {
        console.error(`Mode '${modeName}' not registered`);
        return;
      }

      // Destroy current mode if exists
      if (this.currentModeInstance && typeof this.currentModeInstance.destroy === 'function') {
        try {
          this.currentModeInstance.destroy();
        } catch (error) {
          console.error(`Error destroying mode '${this.currentMode}':`, error);
        }
      }

      // Update UI visibility
      this.updateUIVisibility(modeName);

      // Instantiate new mode
      try {
        const factory = this.modes[modeName];
        const modeInstance = factory();

        if (!modeInstance) {
          throw new Error(`Mode factory returned null for '${modeName}'`);
        }

        this.currentModeInstance = modeInstance;
        this.currentMode = modeName;

        // Update shared services
        if (window.StatusService) {
          window.StatusService.setReady();
        }

        console.log(`Mode '${modeName}' activated`);
      } catch (error) {
        console.error(`Error instantiating mode '${modeName}':`, error);
        if (window.StatusService) {
          window.StatusService.setStatus('Failed to initialize mode');
        }
      }
    }

    /**
     * Update UI visibility for mode switching
     * @param {string} modeName - Mode name ('vector' or 'matrix')
     */
    updateUIVisibility(modeName) {
      if (modeName === 'vector') {
        if (this.matrixContent) {
          this.matrixContent.classList.remove('active');
          this.matrixContent.classList.add('hidden');
        }
        if (this.vectorContent) {
          this.vectorContent.classList.remove('hidden');
          this.vectorContent.classList.add('active');
        }
      } else if (modeName === 'matrix') {
        if (this.vectorContent) {
          this.vectorContent.classList.remove('active');
          this.vectorContent.classList.add('hidden');
        }
        if (this.matrixContent) {
          this.matrixContent.classList.remove('hidden');
          this.matrixContent.classList.add('active');
        }
      }
    }

    /**
     * Get the current active mode
     * @returns {string|null} 'vector', 'matrix', or null
     */
    getCurrentMode() {
      return this.currentMode;
    }

    /**
     * Get the current mode instance
     * @returns {object|null} Current mode instance or null
     */
    getCurrentModeInstance() {
      return this.currentModeInstance;
    }

    /**
     * Reload configuration from config.json
     * Clears ConfigService cache and re-reads config
     * Useful for testing or manual config reload
     */
    reloadConfig() {
      if (window.ConfigService && typeof window.ConfigService.clearCache === 'function') {
        window.ConfigService.clearCache();
      }
    }
  }

  // Export singleton instance
  window.ModeManager = new ModeManager();
})();
