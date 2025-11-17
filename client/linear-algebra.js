/**
 * Interactive Linear Algebra Educational Experience
 * A visual tool for learning vector operations
 */

// ============================================================================
// STYLE CONSTANTS
// ============================================================================
// Immutable styling/layout constants (not runtime configuration)
// Runtime configuration comes from config.json via ConfigService

const STYLE_CONSTANTS = {
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
    matrixBasisI: '#ef4444',  // red for î_A (same as vector1)
    matrixBasisJ: '#3b82f6',  // blue for ĵ_A (same as vector2)
    matrixBasisIB: '#f59e0b',  // orange for î_B
    matrixBasisJB: '#a855f7',  // purple for ĵ_B
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
};

// ============================================================================
// CONFIGURATION LOADING
// ============================================================================

/**
 * Load configuration from config.json using ConfigService
 * Returns immutable appConfig object (single source of truth)
 * Does not mutate any global state
 * @returns {Promise<Object>} Immutable application configuration
 */
async function loadConfig() {
  if (!window.ConfigService) {
    console.warn('ConfigService not available, using default configuration');
    // Return default config structure
    return {
      mode: 'vector',
      vectorMode: {
        maxVectors: 2,
        operationGroups: {}
      },
      matrixMode: {
        operationGroups: {}
      }
    };
  }

  // ConfigService.loadConfig() already merges with DEFAULT_CONFIG
  const rawConfig = await window.ConfigService.loadConfig();

  // Validate and normalize operation groups using schemas, creating a new object
  let validatedConfig = { ...rawConfig };

  if (window.OperationSchemas) {
    if (rawConfig.vectorMode) {
      validatedConfig.vectorMode = {
        ...rawConfig.vectorMode,
        operationGroups: window.OperationSchemas.validateOperationGroups(
          'vector',
          rawConfig.vectorMode.operationGroups || {}
        )
      };
    }
    if (rawConfig.matrixMode) {
      validatedConfig.matrixMode = {
        ...rawConfig.matrixMode,
        operationGroups: window.OperationSchemas.validateOperationGroups(
          'matrix',
          rawConfig.matrixMode.operationGroups || {}
        )
      };
    }
  }

  console.log(`Configuration loaded successfully. Mode: ${validatedConfig.mode}`);

  // Return immutable config (freeze to prevent mutations)
  return Object.freeze(validatedConfig);
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
  // Load immutable appConfig (single source of truth)
  const appConfig = await loadConfig();

  // Initialize CanvasThemeService with STYLE_CONSTANTS
  if (window.CanvasThemeService && typeof window.CanvasThemeService.init === 'function') {
    window.CanvasThemeService.init(STYLE_CONSTANTS);
  }

  // Ensure ModeManager is available
  if (!window.ModeManager) {
    console.error('ModeManager not available');
    if (window.StatusService) {
      window.StatusService.setStatus('Failed to initialize');
    }
    return;
  }

  // Initialize shared CoordinateSystem with styleConstants
  const coordSystem = window.ModeManager.initializeCoordinateSystem(STYLE_CONSTANTS);
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
    return new VectorMode(canvas, appConfig, STYLE_CONSTANTS, coordSystem, vectorContent);
  });

  // Register matrix mode factory
  window.ModeManager.registerMode('matrix', () => {
    const matrixContent = document.querySelector('.mode-content[data-mode="matrix"]');
    if (!matrixContent) {
      console.error('Matrix mode container not found');
      return null;
    }
    const coordSystem = window.ModeManager.getCoordinateSystem();
    const mode = new MatrixMode(appConfig, STYLE_CONSTANTS, coordSystem, matrixContent);
    mode.render(); // Initial render
    return mode;
  });

  // Set the active mode based on config
  const mode = appConfig.mode || 'vector';
  window.ModeManager.setMode(mode);

  // Help modal is initialized by app.js via HelpService
}

function getColorsFromCSS() {
  if (window.ColorUtils) {
    return window.ColorUtils.getColorsFromCSS(STYLE_CONSTANTS);
  }
  // Fallback if ColorUtils not available - return empty object
  // Callers should handle fallbacks using STYLE_CONSTANTS directly
  return {};
}

// Wait for DOM to be ready, then initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Help modal is now initialized by app.js via HelpService
// The help content comes from help-content-template.html
