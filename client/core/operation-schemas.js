/**
 * Operation Group Schemas
 * Defines valid operation group keys for vector and matrix modes
 * Ensures consistency across modes and prevents drift
 */

// Vector operation group keys
const VECTOR_OPERATION_GROUPS = {
  addition: 'addition',
  scalarMultiplication: 'scalarMultiplication',
  dotProduct: 'dotProduct',
  projectionAngle: 'projectionAngle',
  normalization: 'normalization',
  perpendicular: 'perpendicular',
  reflection: 'reflection',
  linearCombination: 'linearCombination'
};

// Matrix operation group keys
const MATRIX_OPERATION_GROUPS = {
  addition: 'addition',
  scalarMultiplication: 'scalarMultiplication',
  multiplication: 'multiplication',
  determinant: 'determinant',
  linearTransformation: 'linearTransformation'
};

/**
 * Validate operation groups for a given mode
 * @param {string} mode - Mode name ('vector' or 'matrix')
 * @param {Object} groups - Operation groups object to validate
 * @returns {Object} - Validated and normalized operation groups object
 */
function validateOperationGroups(mode, groups) {
  if (!groups || typeof groups !== 'object') {
    return {};
  }

  const validKeys = mode === 'vector'
    ? Object.keys(VECTOR_OPERATION_GROUPS)
    : Object.keys(MATRIX_OPERATION_GROUPS);

  const validated = {};

  for (const key of validKeys) {
    // Include key if it exists in groups and is truthy, or default to false
    validated[key] = groups.hasOwnProperty(key) ? Boolean(groups[key]) : false;
  }

  return validated;
}

// Export to global scope
window.OperationSchemas = {
  VECTOR_OPERATION_GROUPS,
  MATRIX_OPERATION_GROUPS,
  validateOperationGroups
};

