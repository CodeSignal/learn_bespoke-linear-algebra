/**
 * VectorOperations Class
 * Encapsulates vector math operations and result formatting
 * Returns operation results without side effects
 */

class VectorOperations {
  constructor(appConfig, styleConstants) {
    this.appConfig = appConfig; // Runtime configuration (for future operation group checks)
    this.styleConstants = styleConstants; // Styling constants (colors, etc.)

    // Set Vector default result color from styleConstants
    if (Vector.setDefaultResultColor) {
      Vector.setDefaultResultColor(styleConstants.colors.result);
    }
  }

  /**
   * Perform vector addition
   * @param {Vector} vector1 - First vector
   * @param {Vector} vector2 - Second vector
   * @returns {Object} Operation result with result vector and formatted strings
   */
  add(vector1, vector2) {
    if (!vector1 || !vector2) return null;

    const result = vector1.add(vector2);
    result.label = 'v₁ + v₂';

    // Log operation
    logAction(`Add operation: v1 (${vector1.x.toFixed(1)}, ${vector1.y.toFixed(1)}) + v2 (${vector2.x.toFixed(1)}, ${vector2.y.toFixed(1)}). Result: (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`);

    const formula = `v₁ + v₂ = [${vector1.x.toFixed(1)}, ${vector1.y.toFixed(1)}] + [${vector2.x.toFixed(1)}, ${vector2.y.toFixed(1)}]`;
    const resultText = `= [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;

    return {
      resultVector: result,
      parallelogramVectors: { v1: vector1, v2: vector2, negatedV2: null },
      resultLines: [formula, resultText]
    };
  }

  /**
   * Perform vector subtraction
   * @param {Vector} vector1 - First vector
   * @param {Vector} vector2 - Second vector
   * @returns {Object} Operation result with result vector and formatted strings
   */
  subtract(vector1, vector2) {
    if (!vector1 || !vector2) return null;

    const result = vector1.subtract(vector2);
    result.label = 'v₁ - v₂';

    // Log operation
    logAction(`Subtract operation: v1 (${vector1.x.toFixed(1)}, ${vector1.y.toFixed(1)}) - v2 (${vector2.x.toFixed(1)}, ${vector2.y.toFixed(1)}). Result: (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`);

    // Create negated v2 for parallelogram visualization (v1 - v2 = v1 + (-v2))
    const negV2 = new Vector(
      -vector2.x,
      -vector2.y,
      vector2.color,
      '-v₂'
    );

    const formula = `v₁ - v₂ = [${vector1.x.toFixed(1)}, ${vector1.y.toFixed(1)}] - [${vector2.x.toFixed(1)}, ${vector2.y.toFixed(1)}]`;
    const resultText = `= [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;

    return {
      resultVector: result,
      parallelogramVectors: { v1: vector1, v2: negV2, negatedV2: negV2 },
      resultLines: [formula, resultText]
    };
  }

  /**
   * Perform scalar multiplication
   * @param {Vector} vector - Vector to scale
   * @param {number} scalar - Scalar value
   * @param {number} vectorNum - Vector number (1 or 2) for labeling
   * @returns {Object} Operation result with result vector and formatted strings
   */
  scale(vector, scalar, vectorNum) {
    if (!vector || isNaN(scalar)) return null;

    const result = vector.scale(scalar);
    result.label = `${scalar}v${vectorNum === 1 ? '₁' : '₂'}`;
    result.color = this.styleConstants.colors.result;  // Use green for scaled vectors

    // Log operation
    logAction(`Scale operation: v${vectorNum} (${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}) * ${scalar}. Result: (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`);

    const formula = `${scalar}v${vectorNum} = ${scalar} × [${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}]`;
    const resultText = `= [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;

    return {
      resultVector: result,
      clearParallelogram: true,
      clearAngleArc: true,
      resultLines: [formula, resultText]
    };
  }

  /**
   * Perform dot product
   * @param {Vector} vector1 - First vector
   * @param {Vector} vector2 - Second vector
   * @returns {Object} Operation result with formatted strings
   */
  dot(vector1, vector2) {
    if (!vector1 || !vector2) return null;

    const dotProduct = vector1.dot(vector2);

    // Log operation
    logAction(`Dot product: v1 (${vector1.x.toFixed(1)}, ${vector1.y.toFixed(1)}) · v2 (${vector2.x.toFixed(1)}, ${vector2.y.toFixed(1)}). Result: ${dotProduct.toFixed(2)}`);

    const formula = `v₁ · v₂ = [${vector1.x.toFixed(1)}, ${vector1.y.toFixed(1)}] · [${vector2.x.toFixed(1)}, ${vector2.y.toFixed(1)}]`;
    const calculation = `= (${vector1.x.toFixed(1)} × ${vector2.x.toFixed(1)}) + (${vector1.y.toFixed(1)} × ${vector2.y.toFixed(1)})`;
    const resultText = `= ${dotProduct.toFixed(2)}`;

    return {
      resultVector: null,
      clearParallelogram: true,
      clearAngleArc: true,
      resultLines: [formula, calculation, resultText]
    };
  }

  /**
   * Perform projection
   * @param {Vector} vector1 - Vector to project
   * @param {Vector} vector2 - Vector to project onto
   * @returns {Object} Operation result with result vector and formatted strings
   */
  project(vector1, vector2) {
    if (!vector1 || !vector2) return null;

    const result = vector1.projectOnto(vector2);
    result.label = 'proj_v₂(v₁)';

    // Log operation
    logAction(`Project operation: v1 (${vector1.x.toFixed(1)}, ${vector1.y.toFixed(1)}) onto v2 (${vector2.x.toFixed(1)}, ${vector2.y.toFixed(1)}). Result: (${result.x.toFixed(2)}, ${result.y.toFixed(2)})`);

    const dotProduct = vector1.dot(vector2);
    const mag2Squared = vector2.x * vector2.x + vector2.y * vector2.y;
    const scalar = dotProduct / mag2Squared;

    const formula = `proj_v₂(v₁) = ((v₁·v₂)/(v₂·v₂)) × v₂`;
    const calculation = `= ((${dotProduct.toFixed(2)})/(${mag2Squared.toFixed(2)})) × [${vector2.x.toFixed(1)}, ${vector2.y.toFixed(1)}]`;
    const resultText = `= [${result.x.toFixed(2)}, ${result.y.toFixed(2)}]`;

    return {
      resultVector: result,
      clearParallelogram: true,
      clearAngleArc: true,
      resultLines: [formula, calculation, resultText]
    };
  }

  /**
   * Calculate angle between vectors
   * @param {Vector} vector1 - First vector
   * @param {Vector} vector2 - Second vector
   * @returns {Object} Operation result with angle arc state and formatted strings
   */
  angleBetween(vector1, vector2) {
    if (!vector1 || !vector2) return null;

    const angleRad = vector1.angleBetween(vector2);
    const angleDeg = vector1.angleBetweenDegrees(vector2);

    // Log operation
    logAction(`Angle between: v1 (${vector1.x.toFixed(1)}, ${vector1.y.toFixed(1)}) and v2 (${vector2.x.toFixed(1)}, ${vector2.y.toFixed(1)}). Result: ${angleDeg.toFixed(2)}°`);

    const dotProduct = vector1.dot(vector2);
    const mag1 = vector1.magnitude();
    const mag2 = vector2.magnitude();

    const formula = `θ = arccos((v₁·v₂)/(||v₁||×||v₂||))`;
    const calculation = `= arccos((${dotProduct.toFixed(2)})/(${mag1.toFixed(2)}×${mag2.toFixed(2)}))`;
    const resultText = `= ${angleDeg.toFixed(2)}° (${angleRad.toFixed(3)} radians)`;

    return {
      resultVector: null,
      clearParallelogram: true,
      angleArcState: {
        vector1: vector1,
        vector2: vector2,
        angleRadians: angleRad,
        angleDegrees: angleDeg
      },
      resultLines: [formula, calculation, resultText]
    };
  }

  /**
   * Normalize a vector
   * @param {Vector} vector - Vector to normalize
   * @param {number} vectorNum - Vector number (1 or 2) for labeling
   * @returns {Object} Operation result with result vector and formatted strings
   */
  normalize(vector, vectorNum) {
    if (!vector) return null;

    const result = vector.normalize();
    result.label = vectorNum === 1 ? 'û₁' : 'û₂';
    result.color = this.styleConstants.colors.result;  // Use green for normalized vectors
    result.lineWidth = 4;  // Thicker line for better visibility

    // Log operation
    logAction(`Normalize operation: v${vectorNum} (${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}). Result: (${result.x.toFixed(3)}, ${result.y.toFixed(3)})`);

    const mag = vector.magnitude();
    const formula = `û${vectorNum} = v${vectorNum}/||v${vectorNum}||`;
    const calculation = `= [${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}]/${mag.toFixed(2)}`;
    const resultText = `= [${result.x.toFixed(3)}, ${result.y.toFixed(3)}] (magnitude = 1.0)`;

    return {
      resultVector: result,
      clearParallelogram: true,
      clearAngleArc: true,
      resultLines: [formula, calculation, resultText]
    };
  }

  /**
   * Get perpendicular vector
   * @param {Vector} vector - Vector to get perpendicular of
   * @param {number} vectorNum - Vector number (1 or 2) for labeling
   * @returns {Object} Operation result with result vector and formatted strings
   */
  perpendicular(vector, vectorNum) {
    if (!vector) return null;

    const result = vector.perpendicular();
    result.label = vectorNum === 1 ? 'v₁⊥' : 'v₂⊥';
    result.color = vectorNum === 1 ? this.styleConstants.colors.vector1 : this.styleConstants.colors.vector2;

    // Log operation
    logAction(`Perpendicular operation: v${vectorNum} (${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}). Result: (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`);

    const formula = `v${vectorNum}⊥ = [-y, x] (90° rotation)`;
    const calculation = `= [${-vector.y.toFixed(1)}, ${vector.x.toFixed(1)}]`;
    const resultText = `= [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;

    return {
      resultVector: result,
      clearParallelogram: true,
      clearAngleArc: true,
      resultLines: [formula, resultText]
    };
  }

  /**
   * Reflect a vector
   * @param {Vector} vector - Vector to reflect
   * @param {number} vectorNum - Vector number (1 or 2) for labeling
   * @param {string} reflectionType - 'x-axis', 'y-axis', or 'diagonal'
   * @returns {Object} Operation result with result vector and formatted strings
   */
  reflect(vector, vectorNum, reflectionType) {
    if (!vector) return null;

    let result, axis, formula;

    // Perform the appropriate reflection
    switch(reflectionType) {
      case 'x-axis':
        result = vector.reflectX();
        result.label = `v${vectorNum}_reflₓ`;
        axis = 'X-axis';
        formula = `Reflect v${vectorNum} across X-axis: (x, y) → (x, -y)`;
        break;
      case 'y-axis':
        result = vector.reflectY();
        result.label = `v${vectorNum}_refly`;
        axis = 'Y-axis';
        formula = `Reflect v${vectorNum} across Y-axis: (x, y) → (-x, y)`;
        break;
      case 'diagonal':
        result = vector.reflectDiagonal();
        result.label = `v${vectorNum}_reflᵈ`;
        axis = 'diagonal (y=x)';
        formula = `Reflect v${vectorNum} across y=x: (x, y) → (y, x)`;
        break;
      default:
        return null;
    }

    // Log operation
    logAction(`Reflect ${axis}: v${vectorNum} (${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}). Result: (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`);

    const calculation = `[${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}] → [${result.x.toFixed(1)}, ${result.y.toFixed(1)}]`;

    return {
      resultVector: result,
      clearParallelogram: true,
      clearAngleArc: true,
      resultLines: [formula, calculation]
    };
  }

  /**
   * Perform linear combination
   * @param {Vector} vector1 - First vector
   * @param {Vector} vector2 - Second vector
   * @param {number} scalarA - Scalar for vector1
   * @param {number} scalarB - Scalar for vector2
   * @returns {Object} Operation result with result vector and formatted strings
   */
  linearCombination(vector1, vector2, scalarA, scalarB) {
    if (!vector1 || !vector2 || isNaN(scalarA) || isNaN(scalarB)) return null;

    // Calculate scaled vectors with proper labels
    const scaledV1 = vector1.scale(scalarA);
    scaledV1.label = `${scalarA}v₁`;
    scaledV1.color = this.styleConstants.parallelogram.v1CopyColor; // Use parallelogram v1 color for consistency

    const scaledV2 = vector2.scale(scalarB);
    scaledV2.label = `${scalarB}v₂`;
    scaledV2.color = this.styleConstants.parallelogram.v2CopyColor; // Use parallelogram v2 color for consistency

    // Calculate result: av₁ + bv₂
    const result = new Vector(
      scaledV1.x + scaledV2.x,
      scaledV1.y + scaledV2.y,
      this.styleConstants.colors.result,
      `${scalarA}v₁ + ${scalarB}v₂`
    );

    // Log operation
    logAction(`Linear combination: ${scalarA}v1 + ${scalarB}v2. Result: (${result.x.toFixed(2)}, ${result.y.toFixed(2)})`);

    const formula = `${scalarA}v₁ + ${scalarB}v₂`;
    const calculation = `= ${scalarA}[${vector1.x.toFixed(1)}, ${vector1.y.toFixed(1)}] + ${scalarB}[${vector2.x.toFixed(1)}, ${vector2.y.toFixed(1)}]`;
    const resultText = `= [${result.x.toFixed(2)}, ${result.y.toFixed(2)}]`;

    return {
      resultVector: result,
      parallelogramVectors: {
        v1: scaledV1,
        v2: scaledV2,
        negatedV2: null,
        isLinearCombination: true,
        scaledV1: scaledV1,
        scaledV2: scaledV2,
        scalarA: scalarA,
        scalarB: scalarB
      },
      resultLines: [formula, calculation, resultText]
    };
  }
}

