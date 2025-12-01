/**
 * Vector Class
 * Represents a 2D mathematical vector with various operations
 */

class Vector {
  // Static default color for result vectors
  static defaultResultColor = getColor('--Colors-Primary-Default');

  constructor(x, y, color, label, lineWidth = null) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.label = label;
    this.lineWidth = lineWidth;  // Optional custom line width
  }

  /**
   * Set the default result color for Vector operations
   * @param {string} color - Color hex string
   */
  static setDefaultResultColor(color) {
    Vector.defaultResultColor = color;
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  angle() {
    return Math.atan2(this.y, this.x);
  }

  angleDegrees() {
    return this.angle() * (180 / Math.PI);
  }

  /**
   * Convert to polar representation
   * @returns {object} - {r: magnitude, theta: angle in degrees (0-360°)}
   */
  toPolar() {
    const r = this.magnitude();
    let theta = this.angleDegrees();

    // Normalize to 0-360° range
    while (theta < 0) theta += 360;
    while (theta >= 360) theta -= 360;

    return { r, theta };
  }

  /**
   * Format coordinates based on display mode
   * @param {string} mode - 'cartesian' or 'polar'
   * @returns {string} - Formatted coordinate string
   */
  formatCoordinates(mode = 'cartesian') {
    if (mode === 'polar') {
      const polar = this.toPolar();
      return `r=${polar.r.toFixed(2)}, θ=${polar.theta.toFixed(1)}°`;
    }
    return `[${this.x.toFixed(1)}, ${this.y.toFixed(1)}]`;
  }

  add(other) {
    return new Vector(
      this.x + other.x,
      this.y + other.y,
      Vector.defaultResultColor,
      'result'
    );
  }

  subtract(other) {
    return new Vector(
      this.x - other.x,
      this.y - other.y,
      Vector.defaultResultColor,
      'result'
    );
  }

  scale(scalar) {
    return new Vector(
      this.x * scalar,
      this.y * scalar,
      Vector.defaultResultColor,
      'result'
    );
  }

  dot(other) {
    return this.x * other.x + this.y * other.y;
  }

  // Project this vector onto another vector
  projectOnto(other) {
    const dotProduct = this.dot(other);
    const otherMagnitudeSquared = other.x * other.x + other.y * other.y;

    if (otherMagnitudeSquared === 0) {
      return new Vector(0, 0, Vector.defaultResultColor, 'proj');
    }

    const scalar = dotProduct / otherMagnitudeSquared;
    return new Vector(
      scalar * other.x,
      scalar * other.y,
      Vector.defaultResultColor,
      'proj'
    );
  }

  // Calculate angle between this vector and another (in radians)
  angleBetween(other) {
    const dotProduct = this.dot(other);
    const mag1 = this.magnitude();
    const mag2 = other.magnitude();

    if (mag1 === 0 || mag2 === 0) return 0;

    // Clamp to [-1, 1] to avoid floating point errors with acos
    const cosAngle = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
    return Math.acos(cosAngle);
  }

  // Calculate angle between this vector and another (in degrees)
  angleBetweenDegrees(other) {
    return this.angleBetween(other) * (180 / Math.PI);
  }

  // Return a normalized (unit) vector
  normalize() {
    const mag = this.magnitude();
    if (mag === 0) {
      return new Vector(0, 0, Vector.defaultResultColor, 'unit');
    }
    return new Vector(
      this.x / mag,
      this.y / mag,
      Vector.defaultResultColor,
      'û'
    );
  }

  // Return a perpendicular vector (90° counterclockwise rotation)
  perpendicular() {
    return new Vector(
      -this.y,
      this.x,
      Vector.defaultResultColor,
      'perp'
    );
  }

  // Reflect vector across X-axis (horizontal flip)
  reflectX() {
    return new Vector(
      this.x,
      -this.y,
      Vector.defaultResultColor,
      'refl_x'
    );
  }

  // Reflect vector across Y-axis (vertical flip)
  reflectY() {
    return new Vector(
      -this.x,
      this.y,
      Vector.defaultResultColor,
      'refl_y'
    );
  }

  // Reflect vector across diagonal line y=x (swap coordinates)
  reflectDiagonal() {
    return new Vector(
      this.y,
      this.x,
      Vector.defaultResultColor,
      'refl_diag'
    );
  }

  clone() {
    return new Vector(this.x, this.y, this.color, this.label, this.lineWidth);
  }
}
