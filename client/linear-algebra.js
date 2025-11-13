/**
 * Interactive Linear Algebra Educational Experience
 * A visual tool for learning vector operations
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = {
  gridSize: 40,           // pixels per unit
  arrowHeadSize: 12,      // pixels
  vectorLineWidth: 3,
  gridLineWidth: 1,
  axisLineWidth: 2,
  hitRadius: 15,          // pixels for endpoint hit detection
  colors: {
    vector1: '#ef4444',   // red
    vector2: '#3b82f6',   // blue
    result: '#10b981',    // green
    matrixBasisI: '#ef4444',  // red for î (same as vector1)
    matrixBasisJ: '#3b82f6',  // blue for ĵ (same as vector2)
    grid: '#d1d5db',      // lighter gray for better contrast in both modes
    axis: '#9ca3af',      // medium gray
    text: '#6b7280',      // medium gray for labels
    hover: '#fbbf24',     // amber - lighter for visibility
    hoverHighlight: '#f59e0b',  // darker amber for hover ring
  },
  animationDuration: 800, // milliseconds
  parallelogram: {
    // Light tinted colors matching source vectors
    v1CopyColor: '#f8b4b4',     // Light red (40% lighter than v1)
    v2CopyColor: '#93c5fd',     // Light blue (40% lighter than v2)
    // Line styling
    lineWidth: 2,               // Thinner than main vectors (3px)
    dashPattern: [8, 4],        // Longer dash than result vector [5,5]
    opacity: 0.5,               // Semi-transparent helper lines
    // Animation timing
    edgeFadeInDuration: 200,    // ms - edges fade in first
    translateDuration: 400,     // ms - each translated vector draws
    staggerDelay: 200,          // ms - delay between translated vectors
  },
  // Application configuration (can be overridden by config.json)
  maxVectors: 2,
  operationGroups: {
    addition: true,
    scalarMultiplication: true,
    dotProduct: true,
    projectionAngle: true,
    normalization: true,
    perpendicular: true,
    reflection: true,
    linearCombination: true,
  },
};

// ============================================================================
// CONFIGURATION LOADING
// ============================================================================

/**
 * Load configuration from config.json using ConfigService
 * Merges loaded config into CONFIG object with defaults as fallback
 */
async function loadConfig() {
  if (!window.ConfigService) {
    console.warn('ConfigService not available, using default configuration');
    CONFIG.mode = 'vector';
      return;
    }

  const userConfig = await window.ConfigService.loadConfig();

    // Load mode (default to vector for backward compatibility)
    CONFIG.mode = userConfig.mode || 'vector';

    // Load mode-specific configuration
    if (CONFIG.mode === 'vector') {
      // Vector mode configuration
    const vectorConfig = userConfig.vectorMode || {};

      if (vectorConfig.maxVectors !== undefined) {
        CONFIG.maxVectors = vectorConfig.maxVectors;
      }

      if (vectorConfig.operationGroups) {
        CONFIG.operationGroups = {
          ...CONFIG.operationGroups,
          ...vectorConfig.operationGroups
        };
      }
    } else if (CONFIG.mode === 'matrix') {
      // Matrix mode configuration
      const matrixConfig = userConfig.matrixMode || {};

      CONFIG.matrixOperationGroups = {
        basicTransformations: true,
        determinant: true,
        ...matrixConfig.operationGroups
      };
    }

    console.log(`Configuration loaded successfully. Mode: ${CONFIG.mode}`);
}

// ============================================================================
// CANVAS & COORDINATE SYSTEM
// ============================================================================
// Note: Vector class is now loaded from core/vector.js
// Note: VectorMode class is now loaded from modes/vector-mode.js

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application based on configured mode
 * Delegates mode lifecycle to ModeManager
 */
async function initializeApp() {
  await loadConfig();

  // Ensure ModeManager is available
  if (!window.ModeManager) {
    console.error('ModeManager not available');
    if (window.StatusService) {
      window.StatusService.setStatus('Failed to initialize');
    }
    return;
  }

  // Initialize shared CoordinateSystem
  const coordSystem = window.ModeManager.initializeCoordinateSystem();
  if (!coordSystem) {
    console.error('Failed to initialize CoordinateSystem');
    if (window.StatusService) {
      window.StatusService.setStatus('Failed to initialize');
    }
    return;
  }

  // Register vector mode factory
  window.ModeManager.registerMode('vector', () => {
    const canvas = document.getElementById('grid-canvas');
    const vectorContent = document.querySelector('.mode-content[data-mode="vector"]');
    if (!vectorContent) {
      console.error('Vector mode container not found');
      return null;
    }
    const coordSystem = window.ModeManager.getCoordinateSystem();
    return new VectorMode(canvas, CONFIG, coordSystem, vectorContent);
  });

  // Register matrix mode factory
  window.ModeManager.registerMode('matrix', () => {
    const matrixContent = document.querySelector('.mode-content[data-mode="matrix"]');
    if (!matrixContent) {
      console.error('Matrix mode container not found');
      return null;
    }
    const coordSystem = window.ModeManager.getCoordinateSystem();
    const mode = new MatrixMode(coordSystem, matrixContent);
    mode.render(); // Initial render
    return mode;
  });

  // Set the active mode based on config
  const mode = CONFIG.mode || 'vector';
  window.ModeManager.setMode(mode);

  // Help modal is initialized by app.js via HelpService
}

function getColorsFromCSS() {
  if (window.ColorUtils) {
    return window.ColorUtils.getColorsFromCSS();
  }
  // Fallback if ColorUtils not available
  const bespokeElement = document.querySelector('.bespoke') || document.documentElement;
  const getColor = (varName) => getComputedStyle(bespokeElement).getPropertyValue(varName).trim();

  return {
    grid: getColor('--bespoke-canvas-grid') || CONFIG.colors.grid,
    axis: getColor('--bespoke-canvas-axis') || CONFIG.colors.axis,
    text: getColor('--bespoke-canvas-text') || CONFIG.colors.text,
    hover: getColor('--bespoke-canvas-hover') || CONFIG.colors.hover,
    hoverHighlight: getColor('--bespoke-canvas-hover-highlight') || CONFIG.colors.hoverHighlight
  };
}

// Wait for DOM to be ready, then initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Help modal is now initialized by app.js via HelpService
// The help content comes from help-content-template.html
