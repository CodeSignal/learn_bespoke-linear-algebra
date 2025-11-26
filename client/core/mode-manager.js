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
      this.modeButtons = [];
      this.currentMode = null;
      this.currentModeInstance = null;
      this.modes = {}; // Registry of mode factories
      this.coordSystem = null; // Shared CoordinateSystem instance
      this.enabledModes = []; // Array of enabled mode names
      this.modeSwitcher = document.querySelector('.mode-switcher');
      this.modeChangeCallbacks = []; // Array of callbacks to notify on mode changes
    }

    /**
     * Render mode buttons dynamically based on enabledModes array
     * Only creates buttons for modes that are enabled
     * @param {string[]} enabledModes - Array of mode names that should be enabled
     */
    renderModeButtons(enabledModes) {
      if (!Array.isArray(enabledModes) || enabledModes.length === 0) {
        console.warn('Invalid enabledModes, enabling all modes by default');
        enabledModes = ['vector', 'matrix', 'tensor'];
      }

      // Store enabled modes for validation
      this.enabledModes = enabledModes;

      if (!this.modeSwitcher) {
        console.error('Mode switcher container not found');
        return;
      }

      // Clear existing buttons
      this.modeSwitcher.innerHTML = '';
      this.modeButtons = [];

      // Mode display names
      const modeLabels = {
        vector: 'Vector',
        matrix: 'Matrix',
        tensor: 'Tensor'
      };

      // Create buttons for each enabled mode
      enabledModes.forEach((mode, index) => {
        const button = document.createElement('button');
        button.className = 'button button-tertiary mode-btn';
        if (enabledModes.length === 1) {
          // Single mode: style as header-like button
          button.classList.add('mode-btn-single');
          button.setAttribute('title', `${modeLabels[mode]} View`);
          button.setAttribute('aria-label', `${modeLabels[mode]} View`);
        }
        button.setAttribute('data-mode', mode);
        button.textContent = modeLabels[mode] || mode;

        // Attach click handler
        button.addEventListener('click', (e) => {
          const targetMode = e.target.dataset.mode;
          this.setMode(targetMode);
        });

        this.modeSwitcher.appendChild(button);
        this.modeButtons.push(button);
      });
    }

    /**
     * Hide mode content containers for disabled modes
     * @param {string[]} enabledModes - Array of mode names that should be enabled
     */
    hideDisabledModeContainers(enabledModes) {
      if (!Array.isArray(enabledModes) || enabledModes.length === 0) {
        console.warn('Invalid enabledModes in hideDisabledModeContainers');
        return;
      }

      // Get all mode content containers
      const allContainers = document.querySelectorAll('.mode-content[data-mode]');

      allContainers.forEach(container => {
        const mode = container.getAttribute('data-mode');
        if (enabledModes.includes(mode)) {
          container.classList.remove('hidden');
        } else {
          container.classList.add('hidden');
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
     * Register a callback to be invoked when mode changes
     * @param {Function} callback - Callback function that receives the new mode name
     */
    onModeChange(callback) {
      if (typeof callback === 'function') {
        this.modeChangeCallbacks.push(callback);
      } else {
        console.warn('onModeChange: callback must be a function');
      }
    }

    /**
     * Set the active mode
     * Handles teardown of current mode and instantiation of new mode
     * @param {string} modeName - Mode name ('vector', 'matrix', or 'tensor')
     */
    setMode(modeName) {
      // Validate mode is enabled
      if (this.enabledModes.length > 0 && !this.enabledModes.includes(modeName)) {
        console.warn(`Mode '${modeName}' is not enabled. Enabled modes: ${this.enabledModes.join(', ')}`);
        if (window.StatusService) {
          window.StatusService.setReady();
        }
        return;
      }

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

        // Notify registered callbacks of mode change
        this.modeChangeCallbacks.forEach(callback => {
          try {
            callback(modeName);
          } catch (error) {
            console.error('Error in mode change callback:', error);
          }
        });
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
          btn.classList.remove('button-tertiary');
          btn.classList.add('button-primary', 'active');
        } else {
          btn.classList.remove('button-primary', 'active');
          btn.classList.add('button-tertiary');
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
