/**
 * Format Utilities
 * Shared formatting functions for matrices and vectors
 * Used by both VectorMode and MatrixMode for consistent result display
 */

(function() {
  /**
   * Format a matrix as an HTML grid element
   * @param {Matrix} matrix - Matrix instance to format
   * @param {number} [precision=1] - Decimal places
   * @returns {string} - HTML string with matrix grid
   */
  function formatMatrixAsGrid(matrix, precision = 1) {
    if (!matrix) return '';

    const rows = matrix.rows;
    const cols = matrix.cols;
    // Create inline grid without padding/background for results display
    let html = '<span style="display: inline-flex; flex-direction: column; gap: 0.125rem; margin: 0 0.25rem; vertical-align: middle;">';

    for (let i = 0; i < rows; i++) {
      html += '<span style="display: flex; gap: 0.25rem; justify-content: center;">';
      for (let j = 0; j < cols; j++) {
        const value = matrix.get(i, j).toFixed(precision);
        html += `<span style="display: inline-block; min-width: 2.5em; text-align: center; font-family: monospace;">${value}</span>`;
      }
      html += '</span>';
    }
    html += '</span>';
    return html;
  }

  /**
   * Format a vector as a string
   * @param {Vector} vector - Vector instance to format
   * @param {number} [precision=1] - Decimal places
   * @returns {string} - Formatted vector string like [x, y]
   */
  function formatVector(vector, precision = 1) {
    if (!vector) return '';
    return `[${vector.x.toFixed(precision)}, ${vector.y.toFixed(precision)}]`;
  }

  // Export to global scope
  window.FormatUtils = {
    formatMatrixAsGrid,
    formatVector
  };
})();

