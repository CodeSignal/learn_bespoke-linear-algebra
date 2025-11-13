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

let app;
let matrixMode;

/**
 * Initialize the application based on configured mode
 */
async function initializeApp() {
  await loadConfig();

  if (CONFIG.mode === 'matrix') {
    // Matrix mode
    console.log('Initializing Matrix Mode');

    // Hide vector mode UI, show matrix mode UI
    if (window.ModeManager) {
      window.ModeManager.showMatrixMode();
    } else {
      // Fallback if ModeManager not available
    const vectorContent = document.querySelector('.mode-content[data-mode="vector"]');
    const matrixContent = document.querySelector('.mode-content[data-mode="matrix"]');
    if (vectorContent) vectorContent.style.display = 'none';
    if (matrixContent) {
      matrixContent.style.display = 'flex';
      matrixContent.classList.add('active');
      }
    }

    // Find matrix mode container
    const matrixContent = document.querySelector('.mode-content[data-mode="matrix"]');
    if (!matrixContent) {
      console.error('Matrix mode container not found');
      return;
    }

    // Initialize coordinate system
    // Use CSS colors if available, fallback to CONFIG defaults
    // MatrixMode will update colors in its constructor
    const canvas = document.getElementById('grid-canvas');
    const colors = window.ColorUtils
      ? window.ColorUtils.getColorsFromCSS()
      : {
          grid: CONFIG.colors.grid,
          axis: CONFIG.colors.axis,
          text: CONFIG.colors.text,
          hover: CONFIG.colors.hover,
          hoverHighlight: CONFIG.colors.hoverHighlight
        };

    const coordSystem = new CoordinateSystem(canvas, colors);

    // Set up resize callback
    coordSystem.setResizeCallback(() => {
      if (matrixMode) matrixMode.render();
    });

    // Initialize matrix mode with root element
    // MatrixMode handles its own theme listener and color updates
    matrixMode = new MatrixMode(coordSystem, matrixContent);
    matrixMode.render();

    // Matrix reset button (use scoped query)
    const matrixResetButton = matrixContent.querySelector('#matrix-reset');
    if (matrixResetButton) {
      matrixResetButton.addEventListener('click', () => {
        matrixMode.inputMatrix = Matrix.identity(2);
        if (matrixMode.elements.m00) matrixMode.elements.m00.value = '1';
        if (matrixMode.elements.m01) matrixMode.elements.m01.value = '0';
        if (matrixMode.elements.m10) matrixMode.elements.m10.value = '0';
        if (matrixMode.elements.m11) matrixMode.elements.m11.value = '1';

        matrixMode.showDeterminantArea = false;

        // Reset Show Area button text
        if (matrixMode.elements.showDeterminant) {
          matrixMode.elements.showDeterminant.textContent = 'Show Area';
        }

        matrixMode.render();
        if (matrixMode.elements.results) {
          matrixMode.elements.results.innerHTML = '<p class="hint">Matrix visualization updates in real-time</p>';
        }
        logAction('Matrix reset to identity');
      });
    }

  } else {
    // Vector mode (existing code)
    console.log('Initializing Vector Mode');

    // Show vector mode UI, hide matrix mode UI
    if (window.ModeManager) {
      window.ModeManager.showVectorMode();
    } else {
      // Fallback if ModeManager not available
    const vectorContent = document.querySelector('.mode-content[data-mode="vector"]');
    const matrixContent = document.querySelector('.mode-content[data-mode="matrix"]');
    if (vectorContent) {
      vectorContent.style.display = 'flex';
      vectorContent.classList.add('active');
    }
    if (matrixContent) matrixContent.style.display = 'none';
    }

    // Initialize vector mode app
    const canvas = document.getElementById('grid-canvas');
    app = new VectorMode(canvas, CONFIG);
  }

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
