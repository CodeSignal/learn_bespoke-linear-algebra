/**
 * Canvas Theme Service
 * Centralizes color loading and theme change listening for canvas-based modes
 */

(function() {
  class CanvasThemeService {
    constructor() {
      this.subscribers = [];
      this.colors = null;
      this.styleConstants = null;
      this.darkModeQuery = null;
      this.themeChangeHandler = null;
      // Don't auto-initialize - wait for init() to be called with styleConstants
    }

    /**
     * Initialize the service
     * Loads initial colors and sets up theme listener
     * @param {Object} styleConstants - Style constants object with colors property for fallbacks
     */
    init(styleConstants) {
      if (!styleConstants || !styleConstants.colors) {
        console.warn('CanvasThemeService.init: styleConstants with colors property is required');
        return;
      }

      this.styleConstants = styleConstants;

      // Load initial colors
      this.loadColors();

      // Set up theme change listener
      this.darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.themeChangeHandler = () => {
        this.loadColors();
        this.notifySubscribers();
      };
      this.darkModeQuery.addEventListener('change', this.themeChangeHandler);
    }

    /**
     * Load colors from CSS using ColorUtils
     * @returns {Object} Color object with theme-responsive colors
     */
    loadColors() {
      if (!this.styleConstants) {
        console.warn('CanvasThemeService.loadColors: styleConstants not set, call init() first');
        return {};
      }

      const colors = window.ColorUtils
        ? window.ColorUtils.getColorsFromCSS(this.styleConstants)
        : {};

      this.colors = colors;
      return colors;
    }

    /**
     * Get current colors (cached)
     * @returns {Object} Color object
     */
    getColors() {
      if (!this.colors) {
        this.loadColors();
      }
      return { ...this.colors }; // Return copy to prevent mutation
    }

    /**
     * Subscribe to theme change notifications
     * @param {Function} callback - Callback function called when theme changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
      if (typeof callback !== 'function') {
        console.warn('CanvasThemeService.subscribe: callback must be a function');
        return () => {};
      }

      this.subscribers.push(callback);

      // Return unsubscribe function
      return () => {
        const index = this.subscribers.indexOf(callback);
        if (index > -1) {
          this.subscribers.splice(index, 1);
        }
      };
    }

    /**
     * Unsubscribe from theme change notifications
     * @param {Function} callback - Callback function to remove
     */
    unsubscribe(callback) {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    }

    /**
     * Notify all subscribers of theme change
     */
    notifySubscribers() {
      this.subscribers.forEach(callback => {
        try {
          callback(this.getColors());
        } catch (error) {
          console.error('Error in theme change subscriber:', error);
        }
      });
    }

    /**
     * Destroy the service and clean up listeners
     */
    destroy() {
      if (this.darkModeQuery && this.themeChangeHandler) {
        this.darkModeQuery.removeEventListener('change', this.themeChangeHandler);
      }
      this.subscribers = [];
      this.colors = null;
      this.darkModeQuery = null;
      this.themeChangeHandler = null;
    }
  }

  // Export singleton instance (not initialized until init() is called)
  window.CanvasThemeService = new CanvasThemeService();
})();

