/**
 * TensorCanvas3D Class
 * Handles 3D rendering and interaction for Tensor Mode
 */
class TensorCanvas3D {
    constructor(canvas, callbacks = {}, colors = null, styleConstants = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.callbacks = callbacks;

        // Use logical dimensions for drawing (context is already scaled by CoordinateSystem)
        this.width = canvas.clientWidth;
        this.height = canvas.clientHeight;

        // Initialize colors with fallback to STYLE_CONSTANTS
        const defaultColors = styleConstants?.colors || {
            grid: '#d1d5db',
            axis: '#9ca3af',
            text: '#6b7280',
            accent: '#3b82f6',
            danger: '#ef4444'
        };
        this.colors = colors || defaultColors;

        // Camera state
        this.rotation = { x: 0.4, y: 0.5 }; // Pitch, Yaw (radians)
        this.zoom = 80; // Scale factor
        this.center = { x: 0, y: 0, z: 0 }; // Look at point

        // Interaction state
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };

        // Bind methods
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.updateDimensions = this.updateDimensions.bind(this);

        this.setupInteraction();

        // Listen for resize via window (or rely on parent calling updateDimensions)
        window.addEventListener('resize', this.updateDimensions);
    }

    /**
     * Update colors from theme service
     * @param {Object} colors - Color object with grid, axis, text, accent, danger properties
     */
    setColors(colors) {
        if (colors) {
            this.colors = colors;
        }
    }

    updateDimensions() {
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;
        if (this.callbacks.onRender) this.callbacks.onRender();
    }

    setupInteraction() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('wheel', this.handleWheel);
    }

    destroy() {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('wheel', this.handleWheel);
        window.removeEventListener('resize', this.updateDimensions);
    }

    handleMouseDown(e) {
        this.isDragging = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.lastMouse.x;
        const deltaY = e.clientY - this.lastMouse.y;

        this.rotation.y += deltaX * 0.01;
        this.rotation.x += deltaY * 0.01;

        // Clamp pitch to avoid flipping
        this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));

        this.lastMouse = { x: e.clientX, y: e.clientY };

        if (this.callbacks.onRender) {
            this.callbacks.onRender();
        }
    }

    handleMouseUp() {
        this.isDragging = false;
    }

    handleWheel(e) {
        e.preventDefault();
        this.zoom += e.deltaY * 0.1;
        this.zoom = Math.max(10, Math.min(200, this.zoom));

        if (this.callbacks.onRender) {
            this.callbacks.onRender();
        }
    }

    /**
     * Reset camera to default rotation and zoom
     */
    resetCamera() {
        this.rotation = { x: 0.4, y: 0.5 }; // Default pitch and yaw
        this.zoom = 80; // Default zoom
        this.center = { x: 0, y: 0, z: 0 }; // Reset center point

        // Trigger re-render if callback is available
        if (this.callbacks.onRender) {
            this.callbacks.onRender();
        }
    }

    // Coordinate Transformations
    project(x, y, z) {
        // 1. Translate to center
        let px = x - this.center.x;
        let py = y - this.center.y;
        let pz = z - this.center.z;

        // 2. Rotate around Y (Yaw)
        let tempX = px * Math.cos(this.rotation.y) - pz * Math.sin(this.rotation.y);
        let tempZ = px * Math.sin(this.rotation.y) + pz * Math.cos(this.rotation.y);
        px = tempX;
        pz = tempZ;

        // 3. Rotate around X (Pitch)
        let tempY = py * Math.cos(this.rotation.x) - pz * Math.sin(this.rotation.x);
        tempZ = py * Math.sin(this.rotation.x) + pz * Math.cos(this.rotation.x);
        py = tempY;
        pz = tempZ;

        // 4. Project (Orthographic with zoom)
        // We can add perspective later if needed, but ortho is often clearer for grids
        // Use logical width/height
        const screenX = this.width / 2 + px * this.zoom;
        const screenY = this.height / 2 - py * this.zoom; // Flip Y for screen coords

        return { x: screenX, y: screenY, z: pz }; // Return z for depth sorting
    }

    // Drawing Primitives
    clear() {
        // Clear using physical canvas dimensions to ensure entire canvas is cleared
        // Reset transform first since context may be scaled by devicePixelRatio
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    drawAxis(length = 5, originOffset = { x: 0, y: 0, z: 0 }) {
        const origin = {
            x: originOffset.x,
            y: originOffset.y,
            z: originOffset.z
        };
        const xAxis = { x: origin.x + length, y: origin.y, z: origin.z };
        const yAxis = { x: origin.x, y: origin.y + length, z: origin.z };
        const zAxis = { x: origin.x, y: origin.y, z: origin.z + length };

        // Use theme colors: X=danger (red), Y=accent (blue), Z=accent (blue)
        const xColor = this.colors.danger || '#ef4444';
        const yColor = this.colors.accent || '#3b82f6';
        const zColor = this.colors.accent || '#3b82f6';
        const labelColor = this.colors.text || '#6b7280';

        this.drawLine(origin, xAxis, xColor, 2); // Red X
        this.drawLine(origin, yAxis, yColor, 2); // Blue Y
        this.drawLine(origin, zAxis, zColor, 2); // Blue Z

        this.drawText('x', xAxis, labelColor);
        this.drawText('y', yAxis, labelColor);
        this.drawText('z', zAxis, labelColor);
    }

    drawGrid(size = 5, step = 1) {
        const gridColor = this.colors.grid || '#d1d5db';
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;

        // Draw grid on XZ plane (y=0)
        for (let i = -size; i <= size; i += step) {
            this.drawLine({ x: i, y: 0, z: -size }, { x: i, y: 0, z: size }, gridColor);
            this.drawLine({ x: -size, y: 0, z: i }, { x: size, y: 0, z: i }, gridColor);
        }
    }

    drawLine(p1, p2, color, width = 1, dash = []) {
        const start = this.project(p1.x, p1.y, p1.z);
        const end = this.project(p2.x, p2.y, p2.z);

        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.setLineDash(dash);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawText(text, pos, color = null) {
        const p = this.project(pos.x, pos.y, pos.z);
        // Use provided color or fall back to theme text color
        this.ctx.fillStyle = color || this.colors.text || '#6b7280';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(text, p.x, p.y);
    }

    drawPoint(pos, radius, color) {
        const p = this.project(pos.x, pos.y, pos.z);
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    // Helper to draw a filled polygon (e.g. for matrix slices)
    drawPolygon(points, color, alpha = 1, strokeColor = null) {
        if (points.length < 3) return;

        const projected = points.map(p => this.project(p.x, p.y, p.z));

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(projected[0].x, projected[0].y);
        for (let i = 1; i < projected.length; i++) {
            this.ctx.lineTo(projected[i].x, projected[i].y);
        }
        this.ctx.closePath();

        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = color;
        this.ctx.fill();

        if (strokeColor) {
            this.ctx.globalAlpha = 1;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    /**
     * Draw a 3D cube at the given position
     * @param {Object} center - {x, y, z} position of cube center
     * @param {number} size - Size of the cube (half-extent)
     * @param {string} edgeColor - Color for cube edges
     * @param {string} faceColor - Color for cube faces
     * @param {number} faceAlpha - Transparency for faces (0-1)
     */
    drawCube(center, size, edgeColor, faceColor, faceAlpha = 0.3) {
        const s = size / 2;
        const { x, y, z } = center;

        // Define 8 vertices of the cube
        const vertices = [
            { x: x - s, y: y - s, z: z - s }, // 0: bottom-left-back
            { x: x + s, y: y - s, z: z - s }, // 1: bottom-right-back
            { x: x + s, y: y + s, z: z - s }, // 2: top-right-back
            { x: x - s, y: y + s, z: z - s }, // 3: top-left-back
            { x: x - s, y: y - s, z: z + s }, // 4: bottom-left-front
            { x: x + s, y: y - s, z: z + s }, // 5: bottom-right-front
            { x: x + s, y: y + s, z: z + s }, // 6: top-right-front
            { x: x - s, y: y + s, z: z + s }  // 7: top-left-front
        ];

        // Define 12 edges (pairs of vertex indices)
        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // back face
            [4, 5], [5, 6], [6, 7], [7, 4], // front face
            [0, 4], [1, 5], [2, 6], [3, 7]  // connecting edges
        ];

        // Define 6 faces (quad vertices)
        const faces = [
            [0, 1, 2, 3], // back face
            [4, 5, 6, 7], // front face
            [0, 1, 5, 4], // bottom face
            [2, 3, 7, 6], // top face
            [0, 3, 7, 4], // left face
            [1, 2, 6, 5]  // right face
        ];

        // Project all vertices
        const projected = vertices.map(v => ({
            ...this.project(v.x, v.y, v.z),
            original: v
        }));

        // Draw faces with transparency (back to front for proper depth)
        // Sort faces by average z-depth
        const facesWithDepth = faces.map(face => ({
            indices: face,
            depth: face.reduce((sum, idx) => sum + projected[idx].z, 0) / face.length
        })).sort((a, b) => b.depth - a.depth); // Back to front

        this.ctx.save();
        facesWithDepth.forEach(({ indices }) => {
            const facePoints = indices.map(idx => projected[idx]);
            this.ctx.beginPath();
            this.ctx.moveTo(facePoints[0].x, facePoints[0].y);
            for (let i = 1; i < facePoints.length; i++) {
                this.ctx.lineTo(facePoints[i].x, facePoints[i].y);
            }
            this.ctx.closePath();
            this.ctx.globalAlpha = faceAlpha;
            this.ctx.fillStyle = faceColor;
            this.ctx.fill();
        });
        this.ctx.restore();

        // Draw edges
        edges.forEach(([i1, i2]) => {
            const v1 = projected[i1];
            const v2 = projected[i2];
            this.drawLine(
                vertices[i1],
                vertices[i2],
                edgeColor,
                1.5
            );
        });
    }

    /**
     * Draw a cube with a number label inside it
     * @param {Object} center - {x, y, z} position of cube center
     * @param {number} size - Size of the cube
     * @param {number|string} value - Value to display inside the cube
     * @param {string} edgeColor - Color for cube edges
     * @param {string} faceColor - Color for cube faces
     * @param {string} textColor - Color for text
     * @param {number} faceAlpha - Transparency for faces
     */
    drawCubeWithLabel(center, size, value, edgeColor, faceColor, textColor, faceAlpha = 0.3) {
        // Draw the cube
        this.drawCube(center, size, edgeColor, faceColor, faceAlpha);

        // Draw the text centered inside the cube
        const text = typeof value === 'number' ? value.toFixed(1) : String(value);
        this.ctx.save();
        const projected = this.project(center.x, center.y, center.z);
        this.ctx.fillStyle = textColor;
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, projected.x, projected.y);
        this.ctx.restore();
    }
}
