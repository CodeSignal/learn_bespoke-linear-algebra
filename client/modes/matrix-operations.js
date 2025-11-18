/**
 * MatrixOperations Class
 * Encapsulates matrix math operations and result formatting
 * Returns operation results without side effects
 */

class MatrixOperations {
  constructor(appConfig, styleConstants) {
    this.appConfig = appConfig; // Runtime configuration (for future operation group checks)
    this.styleConstants = styleConstants; // Styling constants (colors, etc.)
  }

  /**
   * Perform matrix addition
   * @param {Matrix} matrixA - First matrix
   * @param {Matrix} matrixB - Second matrix
   * @returns {Object} Operation result with result matrix and formatted strings
   */
  add(matrixA, matrixB) {
    if (!matrixA || !matrixB) return null;

    const result = matrixA.add(matrixB);

    // Log operation
    logAction(`Matrix addition: A ${matrixA.toCompactString()} + B ${matrixB.toCompactString()}. Result: ${result.toCompactString()}`);

    // Format matrices using FormatUtils if available
    let formula, resultText;
    if (window.FormatUtils) {
      const matrixAHtml = window.FormatUtils.formatMatrixAsGrid(matrixA, 1);
      const matrixBHtml = window.FormatUtils.formatMatrixAsGrid(matrixB, 1);
      const resultHtml = window.FormatUtils.formatMatrixAsGrid(result, 1);
      formula = `A + B = ${matrixAHtml} + ${matrixBHtml}`;
      resultText = `= ${resultHtml}`;
    } else {
      formula = `A + B = ${matrixA.toCompactString()} + ${matrixB.toCompactString()}`;
      resultText = `= ${result.toCompactString()}`;
    }

    return {
      resultMatrix: result,
      resultLines: [formula, resultText]
    };
  }

  /**
   * Perform scalar multiplication
   * @param {Matrix} matrix - Matrix to scale
   * @param {number} scalar - Scalar value
   * @param {string} matrixLabel - Matrix label ('A' or 'B')
   * @returns {Object} Operation result with result matrix and formatted strings
   */
  scalarMultiply(matrix, scalar, matrixLabel) {
    if (!matrix || isNaN(scalar)) return null;

    const result = matrix.scale(scalar);

    // Log operation
    logAction(`Scalar multiplication: ${scalar} × ${matrixLabel} ${matrix.toCompactString()}. Result: ${result.toCompactString()}`);

    // Format matrices using FormatUtils if available
    let formula, resultText;
    if (window.FormatUtils) {
      const matrixHtml = window.FormatUtils.formatMatrixAsGrid(matrix, 1);
      const resultHtml = window.FormatUtils.formatMatrixAsGrid(result, 1);
      formula = `${scalar} × ${matrixLabel} = ${scalar} × ${matrixHtml}`;
      resultText = `= ${resultHtml}`;
    } else {
      formula = `${scalar} × ${matrixLabel} = ${scalar} × ${matrix.toCompactString()}`;
      resultText = `= ${result.toCompactString()}`;
    }

    return {
      resultMatrix: result,
      resultLines: [formula, resultText]
    };
  }

  /**
   * Perform matrix multiplication
   * @param {Matrix} matrixA - First matrix
   * @param {Matrix} matrixB - Second matrix
   * @returns {Object} Operation result with result matrix and formatted strings
   */
  multiply(matrixA, matrixB) {
    if (!matrixA || !matrixB) return null;

    const result = matrixA.multiply(matrixB);

    // Log operation
    logAction(`Matrix multiplication: A ${matrixA.toCompactString()} @ B ${matrixB.toCompactString()}. Result: ${result.toCompactString()}`);

    // Format matrices using FormatUtils if available
    let formula, resultText;
    if (window.FormatUtils) {
      const matrixAHtml = window.FormatUtils.formatMatrixAsGrid(matrixA, 1);
      const matrixBHtml = window.FormatUtils.formatMatrixAsGrid(matrixB, 1);
      const resultHtml = window.FormatUtils.formatMatrixAsGrid(result, 1);
      formula = `A @ B = ${matrixAHtml} @ ${matrixBHtml}`;
      resultText = `= ${resultHtml}`;
    } else {
      formula = `A @ B = ${matrixA.toCompactString()} @ ${matrixB.toCompactString()}`;
      resultText = `= ${result.toCompactString()}`;
    }

    return {
      resultMatrix: result,
      resultLines: [formula, resultText]
    };
  }

  /**
   * Perform linear transformation Ax (matrix times vector)
   * @param {Matrix} matrix - Transformation matrix
   * @param {Vector} vector - Input vector
   * @returns {Object} Operation result with result vector and formatted strings
   */
  transform(matrix, vector) {
    if (!matrix || !vector) return null;

    const resultVector = matrix.transform(vector);

    // Log operation
    logAction(`Linear transformation Ax: A ${matrix.toCompactString()} × v [${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}]. Result: [${resultVector.x.toFixed(2)}, ${resultVector.y.toFixed(2)}]`);

    // Format using FormatUtils if available
    let formula, intermediate, resultText;
    if (window.FormatUtils) {
      const matrixHtml = window.FormatUtils.formatMatrixAsGrid(matrix, 0);
      const vectorColumnHtml = window.FormatUtils.formatVectorAsColumn(vector, 0);

      // Get matrix elements for formula display
      const a = matrix.get(0, 0);
      const b = matrix.get(0, 1);
      const c = matrix.get(1, 0);
      const d = matrix.get(1, 1);

      // Format intermediate step as calculation formula (a·x + b·y format)
      const intermediateHtml = window.FormatUtils.formatIntermediateFormulaAsColumn(a, b, c, d, vector.x, vector.y, 0);
      const resultColumnHtml = window.FormatUtils.formatVectorAsColumn(resultVector, 0);

      formula = `Ax = ${matrixHtml} × ${vectorColumnHtml}`;
      intermediate = `= ${intermediateHtml}`;
      resultText = `= ${resultColumnHtml}`;
    } else {
      // Fallback to compact string format
      const a = matrix.get(0, 0);
      const b = matrix.get(0, 1);
      const c = matrix.get(1, 0);
      const d = matrix.get(1, 1);
      const topIntermediate = a * vector.x + b * vector.y;
      const bottomIntermediate = c * vector.x + d * vector.y;

      // Format intermediate as formula: a·x + b·y
      const aInt = Math.round(a);
      const bInt = Math.round(b);
      const cInt = Math.round(c);
      const dInt = Math.round(d);
      const xInt = Math.round(vector.x);
      const yInt = Math.round(vector.y);
      const topFormula = `${aInt}·${xInt} + ${bInt}·${yInt}`;
      const bottomFormula = `${cInt}·${xInt} + ${dInt}·${yInt}`;

      formula = `Ax = ${matrix.toCompactString()} × [${xInt}, ${yInt}]`;
      intermediate = `= [${topFormula}, ${bottomFormula}]`;
      resultText = `= [${Math.round(resultVector.x)}, ${Math.round(resultVector.y)}]`;
    }

    return {
      resultVector: resultVector,
      resultLines: [formula, intermediate, resultText]
    };
  }
}

