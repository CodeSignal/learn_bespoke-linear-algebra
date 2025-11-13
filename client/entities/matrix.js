/**
 * Matrix Class
 * Represents a 2x2 matrix with mathematical operations
 * All operations are immutable (return new Matrix instances)
 */

class Matrix {
  /**
   * Create a new Matrix
   * @param {number} rows - Number of rows (default: 2)
   * @param {number} cols - Number of columns (default: 2)
   * @param {Array} data - 2D array of matrix values, or null for zero matrix
   */
  constructor(rows = 2, cols = 2, data = null) {
    this.rows = rows;
    this.cols = cols;

    // Store as 2D array for educational clarity: data[row][col]
    if (data) {
      this.data = data.map(row => [...row]); // Deep copy
    } else {
      // Create zero matrix
      this.data = Array(rows).fill(0).map(() => Array(cols).fill(0));
    }
  }

  // ============================================================================
  // STATIC FACTORY METHODS - Common transformations
  // ============================================================================

  /**
   * Create an identity matrix (leaves vectors unchanged)
   * @param {number} size - Size of identity matrix (default: 2)
   * @returns {Matrix} - Identity matrix
   */
  static identity(size = 2) {
    const data = Array(size).fill(0).map((_, i) =>
      Array(size).fill(0).map((_, j) => (i === j ? 1 : 0))
    );
    return new Matrix(size, size, data);
  }

  /**
   * Create a rotation matrix
   * @param {number} angleDegrees - Rotation angle in degrees (counterclockwise)
   * @returns {Matrix} - Rotation matrix
   */
  static rotation(angleDegrees) {
    const angleRad = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    return new Matrix(2, 2, [
      [cos, -sin],
      [sin, cos]
    ]);
  }

  /**
   * Create a scaling matrix
   * @param {number} sx - Scale factor in x direction
   * @param {number} sy - Scale factor in y direction
   * @returns {Matrix} - Scaling matrix
   */
  static scaling(sx, sy) {
    return new Matrix(2, 2, [
      [sx, 0],
      [0, sy]
    ]);
  }

  /**
   * Create a reflection matrix
   * @param {string} axis - 'x', 'y', or 'diagonal' (y=x)
   * @returns {Matrix} - Reflection matrix
   */
  static reflection(axis) {
    switch (axis.toLowerCase()) {
      case 'x':
        return new Matrix(2, 2, [
          [1, 0],
          [0, -1]
        ]);
      case 'y':
        return new Matrix(2, 2, [
          [-1, 0],
          [0, 1]
        ]);
      case 'diagonal':
      case 'diag':
        return new Matrix(2, 2, [
          [0, 1],
          [1, 0]
        ]);
      default:
        return Matrix.identity(2);
    }
  }

  // ============================================================================
  // MATRIX OPERATIONS
  // ============================================================================

  /**
   * Transform a vector by this matrix (matrix-vector multiplication)
   * @param {Vector} vector - Vector to transform
   * @returns {Vector} - Transformed vector
   */
  transform(vector) {
    // For 2×2 matrix and 2D vector: [a b] [x]   [ax + by]
    //                                [c d] [y] = [cx + dy]
    const x = this.data[0][0] * vector.x + this.data[0][1] * vector.y;
    const y = this.data[1][0] * vector.x + this.data[1][1] * vector.y;

    return new Vector(x, y, Vector.defaultResultColor, 'transformed');
  }

  /**
   * Multiply this matrix by another matrix
   * @param {Matrix} other - Matrix to multiply by
   * @returns {Matrix} - Result matrix (this × other)
   */
  multiply(other) {
    if (this.cols !== other.rows) {
      throw new Error(`Cannot multiply ${this.rows}×${this.cols} matrix by ${other.rows}×${other.cols} matrix`);
    }

    const result = new Matrix(this.rows, other.cols);

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < other.cols; j++) {
        let sum = 0;
        for (let k = 0; k < this.cols; k++) {
          sum += this.data[i][k] * other.data[k][j];
        }
        result.data[i][j] = sum;
      }
    }

    return result;
  }

  /**
   * Add this matrix to another matrix
   * @param {Matrix} other - Matrix to add
   * @returns {Matrix} - Result matrix (this + other)
   */
  add(other) {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      throw new Error(`Cannot add matrices of different dimensions`);
    }

    const result = new Matrix(this.rows, this.cols);

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.data[i][j] = this.data[i][j] + other.data[i][j];
      }
    }

    return result;
  }

  /**
   * Multiply this matrix by a scalar
   * @param {number} scalar - Scalar to multiply by
   * @returns {Matrix} - Result matrix (scalar × this)
   */
  scale(scalar) {
    const result = new Matrix(this.rows, this.cols);

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.data[i][j] = this.data[i][j] * scalar;
      }
    }

    return result;
  }

  /**
   * Calculate the determinant of this matrix (2×2 only)
   * @returns {number} - Determinant value
   */
  determinant() {
    if (this.rows !== 2 || this.cols !== 2) {
      throw new Error('Determinant calculation only supported for 2×2 matrices');
    }

    // For 2×2 matrix: det = ad - bc
    return this.data[0][0] * this.data[1][1] - this.data[0][1] * this.data[1][0];
  }

  /**
   * Calculate the trace of this matrix (sum of diagonal elements)
   * @returns {number} - Trace value
   */
  trace() {
    if (this.rows !== this.cols) {
      throw new Error('Trace only defined for square matrices');
    }

    let sum = 0;
    for (let i = 0; i < this.rows; i++) {
      sum += this.data[i][i];
    }
    return sum;
  }

  /**
   * Transpose this matrix (swap rows and columns)
   * @returns {Matrix} - Transposed matrix
   */
  transpose() {
    const result = new Matrix(this.cols, this.rows);

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.data[j][i] = this.data[i][j];
      }
    }

    return result;
  }

  /**
   * Calculate the inverse of this matrix (2×2 only)
   * @returns {Matrix|null} - Inverse matrix, or null if not invertible
   */
  inverse() {
    if (this.rows !== 2 || this.cols !== 2) {
      throw new Error('Inverse calculation only supported for 2×2 matrices');
    }

    const det = this.determinant();

    if (Math.abs(det) < 1e-10) {
      // Matrix is singular (not invertible)
      return null;
    }

    // For 2×2 matrix: inverse = (1/det) * [d  -b]
    //                                      [-c  a]
    const a = this.data[0][0];
    const b = this.data[0][1];
    const c = this.data[1][0];
    const d = this.data[1][1];

    return new Matrix(2, 2, [
      [d / det, -b / det],
      [-c / det, a / det]
    ]);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Create a deep copy of this matrix
   * @returns {Matrix} - Cloned matrix
   */
  clone() {
    return new Matrix(this.rows, this.cols, this.data);
  }

  /**
   * Check if this matrix equals another matrix
   * @param {Matrix} other - Matrix to compare
   * @param {number} epsilon - Tolerance for floating point comparison
   * @returns {boolean} - True if matrices are equal
   */
  equals(other, epsilon = 1e-10) {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      return false;
    }

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (Math.abs(this.data[i][j] - other.data[i][j]) > epsilon) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Convert matrix to string representation
   * @returns {string} - String representation
   */
  toString() {
    return this.data.map(row =>
      '[' + row.map(val => val.toFixed(2)).join(', ') + ']'
    ).join('\n');
  }

  /**
   * Convert matrix to compact string representation (one line)
   * @returns {string} - Compact string
   */
  toCompactString() {
    return '[' + this.data.map(row =>
      '[' + row.map(val => val.toFixed(2)).join(', ') + ']'
    ).join(', ') + ']';
  }

  // ============================================================================
  // PROPERTIES
  // ============================================================================

  /**
   * Check if this is an identity matrix
   * @returns {boolean} - True if identity matrix
   */
  get isIdentity() {
    if (this.rows !== this.cols) return false;

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const expected = i === j ? 1 : 0;
        if (Math.abs(this.data[i][j] - expected) > 1e-10) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if this is an orthogonal matrix (preserves lengths/angles)
   * For orthogonal matrices: M^T × M = I
   * @returns {boolean} - True if orthogonal
   */
  get isOrthogonal() {
    const transposed = this.transpose();
    const product = transposed.multiply(this);
    const identity = Matrix.identity(this.rows);

    return product.equals(identity);
  }

  /**
   * Check if this matrix is invertible (non-zero determinant)
   * @returns {boolean} - True if invertible
   */
  get isInvertible() {
    if (this.rows !== this.cols) return false;
    return Math.abs(this.determinant()) > 1e-10;
  }

  /**
   * Get matrix element at (row, col)
   * @param {number} row - Row index (0-based)
   * @param {number} col - Column index (0-based)
   * @returns {number} - Matrix element
   */
  get(row, col) {
    return this.data[row][col];
  }

  /**
   * Set matrix element at (row, col)
   * @param {number} row - Row index (0-based)
   * @param {number} col - Column index (0-based)
   * @param {number} value - Value to set
   */
  set(row, col, value) {
    this.data[row][col] = value;
  }
}
