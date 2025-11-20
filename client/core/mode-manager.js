/**
 * Mode Manager
 * Lifecycle controller for managing vector and matrix modes
 * Owns shared resources (CoordinateSystem) and handles mode instantiation/teardown
 */

(function () {
  class ModeManager {
    constructor() {
      this.vectorContent = document.querySelector('.mode-content[data-mode="vector"]');
      this.matrixContent = document.querySelector('.mode-content[data-mode="matrix"]');
      this.tensorContent = document.querySelector('.mode-content[data-mode="tensor"]');
      this.modeButtons = document.querySelectorAll('.mode-btn');
      this.setupModeSwitcher();
      this.currentMode = null;
      this.currentModeInstance = null;
      this.modes = {}; // Registry of mode factories
      this.coordSystem = null; // Shared CoordinateSystem instance
    }

    setupModeSwitcher() {
      this.modeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const mode = e.target.dataset.mode;
          // Prevent switching to disabled modes
          if (e.target.disabled) {
            return;
          }
          this.setMode(mode);
        });
      });
    }

    /**
     * Configure mode buttons based on enabledModes array
     * Buttons not in enabledModes will be disabled but remain visible
     * @param {string[]} enabledModes - Array of mode names that should be enabled
     */
    configureModeButtons(enabledModes) {
      if (!Array.isArray(enabledModes) || enabledModes.length === 0) {
        console.warn('Invalid enabledModes, enabling all modes by default');
        enabledModes = ['vector', 'matrix', 'tensor'];
      }

      this.modeButtons.forEach(btn => {
        const mode = btn.dataset.mode;
        if (enabledModes.includes(mode)) {
          btn.removeAttribute('disabled');
          btn.disabled = false;
        } else {
          btn.setAttribute('disabled', 'disabled');
          btn.disabled = true;
          // Remove active class from disabled buttons
          btn.classList.remove('active');
        }
      });
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
      // Update content visibility
      const contents = {
        vector: this.vectorContent,
        matrix: this.matrixContent,
        tensor: this.tensorContent
      };

      Object.entries(contents).forEach(([name, element]) => {
        if (element) {
          if (name === modeName) {
            element.classList.remove('hidden');
            element.classList.add('active');
          } else {
            element.classList.remove('active');
            element.classList.add('hidden');
          }
        }
      });

      // Update switcher buttons
      this.modeButtons.forEach(btn => {
        if (btn.dataset.mode === modeName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
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
