/**
 * Color Utilities
 * Provides functions to extract colors from CSS custom properties
 */

(function() {
  /**
   * Get colors from CSS custom properties
   * @returns {Object} Color object with grid, axis, text, hover, hoverHighlight properties
   */
  function getColorsFromCSS() {
    const bespokeElement = document.querySelector('.bespoke') || document.documentElement;
    const getColor = (varName) => {
      const value = getComputedStyle(bespokeElement).getPropertyValue(varName).trim();
      return value || null;
    };

    // Default fallback colors (from CONFIG if available)
    const defaults = {
      grid: '#d1d5db',
      axis: '#9ca3af',
      text: '#6b7280',
      hover: '#fbbf24',
      hoverHighlight: '#f59e0b'
    };

    return {
      grid: getColor('--bespoke-canvas-grid') || defaults.grid,
      axis: getColor('--bespoke-canvas-axis') || defaults.axis,
      text: getColor('--bespoke-canvas-text') || defaults.text,
      hover: getColor('--bespoke-canvas-hover') || defaults.hover,
      hoverHighlight: getColor('--bespoke-canvas-hover-highlight') || defaults.hoverHighlight,
      accent: getColor('--bespoke-accent') || '#3b82f6',
      danger: getColor('--bespoke-danger') || '#ef4444'
    };
  }

  /**
   * Get a single color value from CSS custom property
   * @param {string} varName - CSS custom property name (e.g., '--bespoke-accent')
   * @param {string} [fallback] - Fallback color if property not found
   * @returns {string} Color value
   */
  function getColorFromCSS(varName, fallback = null) {
    const bespokeElement = document.querySelector('.bespoke') || document.documentElement;
    const value = getComputedStyle(bespokeElement).getPropertyValue(varName).trim();
    return value || fallback;
  }

  // Export to global scope
  window.ColorUtils = {
    getColorsFromCSS,
    getColorFromCSS
  };
})();

