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
    const getColor = (varName) => getComputedStyle(bespokeElement).getPropertyValue(varName).trim() || null;

    // Use styleConstants.colors as fallbacks if provided
    const fallbacks = styleConstants?.colors || {};

    return {
      grid: getColor('--Colors-Stroke-Medium') || fallbacks.grid || null,
      axis: getColor('--Colors-Stroke-Strong') || fallbacks.axis || null,
      text: getColor('--Colors-Text-Body-Light') || fallbacks.text || null,
      hover: getColor('--Colors-Alert-Warning-Default') || fallbacks.hover || null,
      hoverHighlight: getColor('--Colors-Alert-Warning-Medium-Dark') || fallbacks.hoverHighlight || null,
      accent: getColor('--Colors-Primary-Default') || fallbacks.accent || '#3b82f6',
      danger: getColor('--Colors-Alert-Error-Default') || fallbacks.danger || '#ef4444'
    };
  }

  // Export to global scope
  window.ColorUtils = {
    getColorsFromCSS
  };
})();
