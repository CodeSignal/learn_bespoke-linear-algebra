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

  /**
   * Format a vector as an HTML column vector (vertical display)
   * @param {Vector} vector - Vector instance to format
   * @param {number} [precision=1] - Decimal places
   * @returns {string} - HTML string with column vector
   */
  function formatVectorAsColumn(vector, precision = 1) {
    if (!vector) return '';
    // Create inline column display similar to formatMatrixAsGrid but for a single column
    let html = '<span style="display: inline-flex; flex-direction: column; gap: 0.125rem; margin: 0 0.25rem; vertical-align: middle;">';
    html += '<span style="display: flex; gap: 0.25rem; justify-content: center;">';
    html += `<span style="display: inline-block; min-width: 2.5em; text-align: center; font-family: monospace;">${vector.x.toFixed(precision)}</span>`;
    html += '</span>';
    html += '<span style="display: flex; gap: 0.25rem; justify-content: center;">';
    html += `<span style="display: inline-block; min-width: 2.5em; text-align: center; font-family: monospace;">${vector.y.toFixed(precision)}</span>`;
    html += '</span>';
    html += '</span>';
    return html;
  }

  /**
   * Format intermediate calculation values as a column vector
   * @param {number} top - Top component value
   * @param {number} bottom - Bottom component value
   * @param {number} [precision=2] - Decimal places
   * @returns {string} - HTML string with column vector
   */
  function formatIntermediateAsColumn(top, bottom, precision = 1) {
    let html = '<span style="display: inline-flex; flex-direction: column; gap: 0.125rem; margin: 0 0.25rem; vertical-align: middle;">';
    html += '<span style="display: flex; gap: 0.25rem; justify-content: center;">';
    html += `<span style="display: inline-block; min-width: 2.5em; text-align: center; font-family: monospace;">${top.toFixed(precision)}</span>`;
    html += '</span>';
    html += '<span style="display: flex; gap: 0.25rem; justify-content: center;">';
    html += `<span style="display: inline-block; min-width: 2.5em; text-align: center; font-family: monospace;">${bottom.toFixed(precision)}</span>`;
    html += '</span>';
    html += '</span>';
    return html;
  }

  /**
   * Format intermediate calculation formula as a column vector (e.g., "a·x + b·y")
   * @param {number} a - Matrix element a (row 0, col 0)
   * @param {number} b - Matrix element b (row 0, col 1)
   * @param {number} c - Matrix element c (row 1, col 0)
   * @param {number} d - Matrix element d (row 1, col 1)
   * @param {number} x - Vector x component
   * @param {number} y - Vector y component
   * @param {number} [precision=0] - Decimal places
   * @returns {string} - HTML string with column vector showing calculation formula
   */
  function formatIntermediateFormulaAsColumn(a, b, c, d, x, y, precision = 0) {
    // Round values to specified precision
    const roundValue = (val) => {
      const factor = Math.pow(10, precision);
      return Math.round(val * factor) / factor;
    };

    const aVal = roundValue(a);
    const bVal = roundValue(b);
    const cVal = roundValue(c);
    const dVal = roundValue(d);
    const xVal = roundValue(x);
    const yVal = roundValue(y);

    // Format top: a·x + b·y
    const topFormula = `${aVal.toFixed(precision)}·${xVal.toFixed(precision)} + ${bVal.toFixed(precision)}·${yVal.toFixed(precision)}`;
    // Format bottom: c·x + d·y
    const bottomFormula = `${cVal.toFixed(precision)}·${xVal.toFixed(precision)} + ${dVal.toFixed(precision)}·${yVal.toFixed(precision)}`;

    let html = '<span style="display: inline-flex; flex-direction: column; gap: 0.125rem; margin: 0 0.25rem; vertical-align: middle;">';
    html += '<span style="display: flex; gap: 0.25rem; justify-content: center;">';
    html += `<span style="display: inline-block; text-align: center; font-family: monospace;">${topFormula}</span>`;
    html += '</span>';
    html += '<span style="display: flex; gap: 0.25rem; justify-content: center;">';
    html += `<span style="display: inline-block; text-align: center; font-family: monospace;">${bottomFormula}</span>`;
    html += '</span>';
    html += '</span>';
    return html;
  }

  // Export to global scope
  window.FormatUtils = {
    formatMatrixAsGrid,
    formatVector,
    formatVectorAsColumn,
    formatIntermediateAsColumn,
    formatIntermediateFormulaAsColumn
  };
})();

