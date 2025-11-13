/**
 * Color Utilities
 * Provides functions to extract colors from CSS custom properties
 */

(function() {
  /**
   * Get colors from CSS custom properties
   * @param {Object} [styleConstants] - Optional style constants object with colors property for fallbacks
   * @returns {Object} Color object with grid, axis, text, hover, hoverHighlight, accent, danger properties
   */
  function getColorsFromCSS(styleConstants = null) {
    const bespokeElement = document.querySelector('.bespoke') || document.documentElement;
    const getColor = (varName) => {
      const value = getComputedStyle(bespokeElement).getPropertyValue(varName).trim();
      return value || null;
    };

    // Use styleConstants.colors as fallbacks if provided
    const fallbacks = styleConstants?.colors || {};

    return {
      grid: getColor('--bespoke-canvas-grid') || fallbacks.grid || null,
      axis: getColor('--bespoke-canvas-axis') || fallbacks.axis || null,
      text: getColor('--bespoke-canvas-text') || fallbacks.text || null,
      hover: getColor('--bespoke-canvas-hover') || fallbacks.hover || null,
      hoverHighlight: getColor('--bespoke-canvas-hover-highlight') || fallbacks.hoverHighlight || null,
      accent: getColor('--bespoke-accent') || fallbacks.accent || '#3b82f6',
      danger: getColor('--bespoke-danger') || fallbacks.danger || '#ef4444'
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

