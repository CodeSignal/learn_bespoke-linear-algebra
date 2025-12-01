/**
 * TensorMode Class
 * Visualization for tensors of different ranks (0-3)
 */

class TensorMode {
  constructor(canvas, appConfig, styleConstants, coordSystem, rootElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.appConfig = appConfig;
    this.styleConstants = styleConstants;
    this.coordSystem = coordSystem;
    this.root = rootElement;

    // State
    this.rank = 0; // Default to scalar (rank 0)
    this.tensorData = {
      scalar: 1.0,
      vector: { x: 2, y: 1 },
      matrix: [[1, 0], [0, 1]],
      tensor3d: [
        [[1, 0], [0, 1]],
        [[0, 1], [1, 0]]
      ]
    };

    // Colors
    this.colors = {};
    this.themeUnsubscribe = null;
    this.loadColors();

    // Event listener tracking for cleanup
    this.eventListeners = [];

    // Bound handler methods (stored for proper cleanup)
    this.handleRankClick = null;
    this.handleReset = null;
    this.handleScalarInput = null;
    this.handleVectorInput = null;
    this.handleMatrixInput = null;
    this.handleTensor3DInput = null;

    // Subscribe to theme changes
    if (window.CanvasThemeService) {
      this.themeUnsubscribe = window.CanvasThemeService.subscribe(() => {
        this.loadColors();
        this.render();
      });
    }

    // Initialize 3D Canvas with initial colors and styleConstants
    this.tensorCanvas3D = new TensorCanvas3D(canvas, {
      onRender: () => this.render()
    }, this.colors, styleConstants);

    // Setup UI
    this.setupUI();
    this.setupEventListeners();

    // Initial render
    this.render();
  }

  loadColors() {
    if (window.CanvasThemeService) {
      const themeColors = window.CanvasThemeService.getColors();
      this.colors = {
        ...themeColors,
        cubeEdge: themeColors.accent || themeColors.axis,
        cubeFace: themeColors.accent || themeColors.axis
      };
    } else {
      this.colors = {
        grid: this.styleConstants.colors.grid,
        axis: this.styleConstants.colors.axis,
        text: this.styleConstants.colors.text,
        cubeEdge: this.styleConstants.colors.accent || this.styleConstants.colors.axis,
        cubeFace: this.styleConstants.colors.accent || this.styleConstants.colors.axis
      };
    }

    if (this.coordSystem) {
      this.coordSystem.updateColors(this.colors);
    }

    // Update 3D canvas colors when theme changes
    if (this.tensorCanvas3D) {
      this.tensorCanvas3D.setColors(this.colors);
    }
  }

  setupUI() {
    // Create sidebar content
    this.root.innerHTML = `
      <div class="sidebar-section">
        <div class="section-header">
          <div></div>
          <button id="tensor-reset" class="button button-secondary button-small">Reset</button>
        </div>

        <div class="tensor-controls">
          <div class="control-group">
            <label>Tensor Rank</label>
            <div class="rank-selector">
              <button class="button button-tertiary rank-btn active" data-rank="0">0 (Scalar)</button>
              <button class="button button-tertiary rank-btn" data-rank="1">1 (Vector)</button>
              <button class="button button-tertiary rank-btn" data-rank="2">2 (Matrix)</button>
              <button class="button button-tertiary rank-btn" data-rank="3">3 (3D Tensor)</button>
            </div>
          </div>

          <div id="tensor-input-container" class="tensor-input-container">
            <!-- Dynamic content based on rank -->
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <p class="hint body-xsmall">Drag to rotate, Scroll to zoom</p>
      </div>
    `;

    this.updateInputUI();
  }

  updateInputUI() {
    const container = this.root.querySelector('#tensor-input-container');

    let html = '';

    switch (this.rank) {
      case 0:
        html = `
          <div class="scalar-input-wrapper">
            <label>Value</label>
            <input type="number" id="tensor-scalar-input" class="input matrix-input" value="${this.tensorData.scalar}" step="0.1">
          </div>
        `;
        break;
      case 1:
        html = `
          <div class="vector-input-wrapper">
            <label>Components</label>
            <div class="matrix-grid small">
              <div class="matrix-row">
                <input type="number" id="tensor-vector-x" class="input matrix-input" value="${this.tensorData.vector.x}" step="0.1" placeholder="x">
                <input type="number" id="tensor-vector-y" class="input matrix-input" value="${this.tensorData.vector.y}" step="0.1" placeholder="y">
              </div>
            </div>
          </div>
        `;
        break;
      case 2:
        html = `
          <div class="matrix-input-wrapper">
            <label>2x2 Matrix</label>
            <div class="matrix-grid small">
              <div class="matrix-row">
                <input type="number" id="tensor-m00" class="input matrix-input" value="${this.tensorData.matrix[0][0]}" step="0.1">
                <input type="number" id="tensor-m01" class="input matrix-input" value="${this.tensorData.matrix[0][1]}" step="0.1">
              </div>
              <div class="matrix-row">
                <input type="number" id="tensor-m10" class="input matrix-input" value="${this.tensorData.matrix[1][0]}" step="0.1">
                <input type="number" id="tensor-m11" class="input matrix-input" value="${this.tensorData.matrix[1][1]}" step="0.1">
              </div>
            </div>
          </div>
        `;
        break;
      case 3:
        html = `
          <div class="tensor3d-input-wrapper">
            <label>2x2x2 Tensor (2 Slices)</label>
            <div class="tensor-slices">
              <div class="slice">
                <span class="body-xsmall">Slice 1 (Front, z=0)</span>
                <div class="matrix-grid small">
                  <div class="matrix-row">
                    <input type="number" id="tensor-t000" class="input matrix-input" value="${this.tensorData.tensor3d[0][0][0]}" step="0.1">
                    <input type="number" id="tensor-t001" class="input matrix-input" value="${this.tensorData.tensor3d[0][0][1]}" step="0.1">
                  </div>
                  <div class="matrix-row">
                    <input type="number" id="tensor-t010" class="input matrix-input" value="${this.tensorData.tensor3d[0][1][0]}" step="0.1">
                    <input type="number" id="tensor-t011" class="input matrix-input" value="${this.tensorData.tensor3d[0][1][1]}" step="0.1">
                  </div>
                </div>
              </div>
              <div class="slice">
                <span class="body-xsmall">Slice 2 (Back, z=1)</span>
                <div class="matrix-grid small">
                  <div class="matrix-row">
                    <input type="number" id="tensor-t100" class="input matrix-input" value="${this.tensorData.tensor3d[1][0][0]}" step="0.1">
                    <input type="number" id="tensor-t101" class="input matrix-input" value="${this.tensorData.tensor3d[1][0][1]}" step="0.1">
                  </div>
                  <div class="matrix-row">
                    <input type="number" id="tensor-t110" class="input matrix-input" value="${this.tensorData.tensor3d[1][1][0]}" step="0.1">
                    <input type="number" id="tensor-t111" class="input matrix-input" value="${this.tensorData.tensor3d[1][1][1]}" step="0.1">
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        break;
    }

    container.innerHTML = html;

    // Re-attach listeners for new inputs
    this.attachInputListeners();
  }

  setupEventListeners() {
    // Rank selection - create bound handler
    this.handleRankClick = (e) => {
      const rankBtns = this.root.querySelectorAll('.rank-btn');
      // Update active state
      rankBtns.forEach(b => {
        b.classList.remove('active', 'button-primary');
        b.classList.add('button-tertiary');
      });
      e.target.classList.add('active', 'button-primary');
      e.target.classList.remove('button-tertiary');

      // Update rank
      this.rank = parseInt(e.target.dataset.rank);

      // Log rank change
      try {
        logAction(`Tensor rank changed to ${this.rank}`);
      } catch (err) {
        console.error('Failed to log rank change:', err);
      }

      this.updateInputUI();
      this.render();
    };

    const rankBtns = this.root.querySelectorAll('.rank-btn');
    rankBtns.forEach(btn => {
      btn.addEventListener('click', this.handleRankClick);
      this.eventListeners.push({ element: btn, event: 'click', handler: this.handleRankClick });
    });

    // Reset button - create bound handler
    this.handleReset = () => {
      this.tensorData = {
        scalar: 1.0,
        vector: { x: 2, y: 1 },
        matrix: [[1, 0], [0, 1]],
        tensor3d: [
          [[1, 0], [0, 1]],
          [[0, 1], [1, 0]]
        ]
      };

      // Reset camera to default view
      if (this.tensorCanvas3D) {
        this.tensorCanvas3D.resetCamera();
      }

      // Log reset with default values
      try {
        logAction('Tensor reset: scalar=1.0, vector=(2.0, 1.0), matrix=[[1,0],[0,1]], tensor3d=[[[1,0],[0,1]],[[0,1],[1,0]]]');
      } catch (err) {
        console.error('Failed to log reset:', err);
      }

      this.updateInputUI();
      this.render();
    };

    const resetBtn = this.root.querySelector('#tensor-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', this.handleReset);
      this.eventListeners.push({ element: resetBtn, event: 'click', handler: this.handleReset });
    }
  }

  attachInputListeners() {
    // Remove any existing input listeners before attaching new ones
    // Filter out input listeners (they have 'input' event type)
    const inputListeners = this.eventListeners.filter(
      ({ event }) => event === 'input'
    );
    inputListeners.forEach(({ element, event, handler }) => {
      if (element && typeof element.removeEventListener === 'function') {
        element.removeEventListener(event, handler);
      }
    });
    // Remove input listeners from tracking array
    this.eventListeners = this.eventListeners.filter(
      ({ event }) => event !== 'input'
    );

    // Scalar
    const scalarInput = this.root.querySelector('#tensor-scalar-input');
    if (scalarInput) {
      this.handleScalarInput = (e) => {
        this.tensorData.scalar = parseFloat(e.target.value) || 0;

        // Log scalar input change
        try {
          logAction(`Tensor scalar input changed: ${this.tensorData.scalar.toFixed(1)}`);
        } catch (err) {
          console.error('Failed to log scalar input:', err);
        }

        this.render();
      };
      scalarInput.addEventListener('input', this.handleScalarInput);
      this.eventListeners.push({ element: scalarInput, event: 'input', handler: this.handleScalarInput });
    }

    // Vector
    const vx = this.root.querySelector('#tensor-vector-x');
    const vy = this.root.querySelector('#tensor-vector-y');
    if (vx && vy) {
      this.handleVectorInput = () => {
        this.tensorData.vector.x = parseFloat(vx.value) || 0;
        this.tensorData.vector.y = parseFloat(vy.value) || 0;

        // Log vector input change
        try {
          logAction(`Tensor vector input changed: x=${this.tensorData.vector.x.toFixed(1)}, y=${this.tensorData.vector.y.toFixed(1)}`);
        } catch (err) {
          console.error('Failed to log vector input:', err);
        }

        this.render();
      };
      vx.addEventListener('input', this.handleVectorInput);
      vy.addEventListener('input', this.handleVectorInput);
      this.eventListeners.push({ element: vx, event: 'input', handler: this.handleVectorInput });
      this.eventListeners.push({ element: vy, event: 'input', handler: this.handleVectorInput });
    }

    // Matrix
    if (this.rank === 2) {
      const inputs = this.root.querySelectorAll('.matrix-input-wrapper input');
      this.handleMatrixInput = (input) => {
        // Parse indices from tensor-m00 format: positions 8 and 9 contain row and col
        const r = parseInt(input.id.slice(8, 9));
        const c = parseInt(input.id.slice(9, 10));
        this.tensorData.matrix[r][c] = parseFloat(input.value) || 0;

        // Log matrix input change
        try {
          logAction(`Tensor matrix input changed: [${r},${c}]=${this.tensorData.matrix[r][c].toFixed(1)}`);
        } catch (err) {
          console.error('Failed to log matrix input:', err);
        }

        this.render();
      };
      inputs.forEach(input => {
        const handler = () => this.handleMatrixInput(input);
        input.addEventListener('input', handler);
        this.eventListeners.push({ element: input, event: 'input', handler });
      });
    }

    // Tensor 3D
    if (this.rank === 3) {
      const inputs = this.root.querySelectorAll('.tensor3d-input-wrapper input');
      this.handleTensor3DInput = (input) => {
        // Parse indices from tensor-t000 format: positions 8, 9, and 10 contain slice, row, and col
        const s = parseInt(input.id.slice(8, 9));
        const r = parseInt(input.id.slice(9, 10));
        const c = parseInt(input.id.slice(10, 11));
        this.tensorData.tensor3d[s][r][c] = parseFloat(input.value) || 0;

        // Log tensor 3D input change
        try {
          logAction(`Tensor 3D input changed: [${s},${r},${c}]=${this.tensorData.tensor3d[s][r][c].toFixed(1)}`);
        } catch (err) {
          console.error('Failed to log tensor 3D input:', err);
        }

        this.render();
      };
      inputs.forEach(input => {
        const handler = () => this.handleTensor3DInput(input);
        input.addEventListener('input', handler);
        this.eventListeners.push({ element: input, event: 'input', handler });
      });
    }
  }

  render() {
    // Use 3D Canvas for everything in this mode
    this.tensorCanvas3D.clear();
    // Draw axes offset to the bottom-left-back corner to avoid overlapping with tensor cubes
    this.tensorCanvas3D.drawAxis(5, { x: -3, y: -3, z: -3 });

    switch (this.rank) {
      case 0:
        this.renderScalar();
        break;
      case 1:
        this.renderVector();
        break;
      case 2:
        this.renderMatrix();
        break;
      case 3:
        this.renderTensor3D();
        break;
    }
  }

  renderScalar() {
    // Visualize scalar as a single cube at origin
    const value = this.tensorData.scalar;
    const cubeSize = 0.8;

    this.tensorCanvas3D.drawCubeWithLabel(
      { x: 0, y: 0, z: 0 },
      cubeSize,
      value,
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );
  }

  renderVector() {
    // Visualize vector as two cubes in a horizontal row
    const v = this.tensorData.vector;
    const cubeSize = 0.8;
    const spacing = 1.2; // Center-to-center spacing

    // Position cubes horizontally (x-axis)
    const x1 = -spacing / 2;
    const x2 = spacing / 2;

    // Draw first cube (x component)
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: x1, y: 0, z: 0 },
      cubeSize,
      v.x,
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );

    // Draw second cube (y component)
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: x2, y: 0, z: 0 },
      cubeSize,
      v.y,
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );
  }

  renderMatrix() {
    // Visualize matrix as a 2x2 grid of cubes
    const m = this.tensorData.matrix;
    const cubeSize = 0.8;
    const spacing = 1.2; // Center-to-center spacing

    // Matrix layout: [m00, m01]
    //                 [m10, m11]
    // Position cubes in a 2x2 grid, centered at origin
    const offset = spacing / 2;

    // Top row
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: -offset, y: offset, z: 0 },
      cubeSize,
      m[0][0],
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: offset, y: offset, z: 0 },
      cubeSize,
      m[0][1],
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );

    // Bottom row
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: -offset, y: -offset, z: 0 },
      cubeSize,
      m[1][0],
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: offset, y: -offset, z: 0 },
      cubeSize,
      m[1][1],
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );
  }

  renderTensor3D() {
    // Visualize rank-3 tensor as a 2x2x2 cube of cubes
    const t = this.tensorData.tensor3d;
    const cubeSize = 0.8;
    const spacing = 1.2; // Center-to-center spacing

    // Tensor layout: 2 slices (z=0 and z=spacing), each with a 2x2 matrix
    // Slice 0 (front): t[0][row][col]
    // Slice 1 (back):  t[1][row][col]
    const offset = spacing / 2;

    // Front slice (z = -offset)
    const zFront = -offset;
    // Top-left
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: -offset, y: offset, z: zFront },
      cubeSize,
      t[0][0][0],
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );
    // Top-right
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: offset, y: offset, z: zFront },
      cubeSize,
      t[0][0][1],
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );
    // Bottom-left
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: -offset, y: -offset, z: zFront },
      cubeSize,
      t[0][1][0],
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );
    // Bottom-right
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: offset, y: -offset, z: zFront },
      cubeSize,
      t[0][1][1],
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );

    // Back slice (z = offset)
    const zBack = offset;
    // Top-left
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: -offset, y: offset, z: zBack },
      cubeSize,
      t[1][0][0],
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );
    // Top-right
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: offset, y: offset, z: zBack },
      cubeSize,
      t[1][0][1],
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );
    // Bottom-left
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: -offset, y: -offset, z: zBack },
      cubeSize,
      t[1][1][0],
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );
    // Bottom-right
    this.tensorCanvas3D.drawCubeWithLabel(
      { x: offset, y: -offset, z: zBack },
      cubeSize,
      t[1][1][1],
      this.colors.cubeEdge,
      this.colors.cubeFace,
      this.colors.text,
      0.3
    );
  }

  destroy() {
    // Remove all event listeners
    if (this.eventListeners) {
      this.eventListeners.forEach(({ element, event, handler }) => {
        if (element && typeof element.removeEventListener === 'function') {
          element.removeEventListener(event, handler);
        }
      });
      this.eventListeners = [];
    }

    // Unsubscribe from theme service
    if (this.themeUnsubscribe) {
      this.themeUnsubscribe();
      this.themeUnsubscribe = null;
    }

    // Cleanup 3D canvas
    if (this.tensorCanvas3D) {
      this.tensorCanvas3D.destroy();
    }

    // Clear root innerHTML to ensure clean state
    if (this.root) {
      this.root.innerHTML = '';
    }

    // Clear handler references
    this.handleRankClick = null;
    this.handleReset = null;
    this.handleScalarInput = null;
    this.handleVectorInput = null;
    this.handleMatrixInput = null;
    this.handleTensor3DInput = null;
  }
}

