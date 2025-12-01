/**
 * Color Utilities
 * Provides functions to extract colors from CSS custom properties
 */

(function() {
  /**
   * Get colors from CSS custom properties
   * Reads directly from design system CSS variables (no fallbacks needed since CSS loads before JS)
   * @param {Object} [styleConstants] - Optional parameter kept for backward compatibility (unused)
   * @returns {Object} Color object with grid, axis, text, hover, hoverHighlight, accent, danger properties
   */
  function getColorsFromCSS(styleConstants = null) {
    const bespokeElement = document.querySelector('.bespoke') || document.documentElement;
    const getColor = (varName) => getComputedStyle(bespokeElement).getPropertyValue(varName).trim() || null;

    return {
      grid: getColor('--Colors-Stroke-Stronger'),
      axis: getColor('--Colors-Stroke-Primary-Dark'),
      text: getColor('--Colors-Text-Body-Light'),
      hover: getColor('--Colors-Alert-Warning-Default'),
      hoverHighlight: getColor('--Colors-Alert-Warning-Medium-Dark'),
      accent: getColor('--Colors-Primary-Default') || '#3b82f6',
      danger: getColor('--Colors-Alert-Error-Default') || '#ef4444'
    };
  }

  // Export to global scope
  window.ColorUtils = {
    getColorsFromCSS
  };
})();
