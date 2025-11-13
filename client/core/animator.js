/**
 * Animator Class
 * Provides animation utilities and easing functions
 */

class Animator {
  /**
   * Easing function: ease-out-cubic
   * Starts fast, ends slow
   * @param {number} progress - Animation progress from 0 to 1
   * @returns {number} - Eased progress value
   */
  static easeOutCubic(progress) {
    return 1 - Math.pow(1 - progress, 3);
  }

  /**
   * Easing function: ease-in-cubic
   * Starts slow, ends fast
   * @param {number} progress - Animation progress from 0 to 1
   * @returns {number} - Eased progress value
   */
  static easeInCubic(progress) {
    return Math.pow(progress, 3);
  }

  /**
   * Easing function: ease-in-out-cubic
   * Starts slow, speeds up, ends slow
   * @param {number} progress - Animation progress from 0 to 1
   * @returns {number} - Eased progress value
   */
  static easeInOutCubic(progress) {
    return progress < 0.5
      ? 4 * Math.pow(progress, 3)
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }

  /**
   * Generic animation function using requestAnimationFrame
   * @param {object} options - Animation options
   * @param {number} options.duration - Duration in milliseconds
   * @param {function} options.onFrame - Callback called each frame with eased progress (0-1)
   * @param {function} options.onComplete - Callback called when animation completes
   * @param {function} options.easingFunction - Easing function to use (default: easeOutCubic)
   * @returns {object} - Control object with cancel() method
   */
  static animate(options) {
    const {
      duration,
      onFrame,
      onComplete,
      easingFunction = Animator.easeOutCubic
    } = options;

    const startTime = performance.now();
    let cancelled = false;
    let animationId = null;

    const frame = (currentTime) => {
      if (cancelled) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easingFunction(progress);

      onFrame(eased, progress);

      if (progress < 1) {
        animationId = requestAnimationFrame(frame);
      } else {
        if (onComplete) onComplete();
      }
    };

    animationId = requestAnimationFrame(frame);

    // Return control object
    return {
      cancel: () => {
        cancelled = true;
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      }
    };
  }

  /**
   * Linear interpolation between two values
   * @param {number} start - Start value
   * @param {number} end - End value
   * @param {number} progress - Progress from 0 to 1
   * @returns {number} - Interpolated value
   */
  static lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  /**
   * Linear interpolation between two Vector objects
   * @param {Vector} start - Start vector
   * @param {Vector} end - End vector
   * @param {number} progress - Progress from 0 to 1
   * @returns {Vector} - Interpolated vector
   */
  static lerpVector(start, end, progress) {
    return new Vector(
      Animator.lerp(start.x, end.x, progress),
      Animator.lerp(start.y, end.y, progress),
      end.color,
      end.label,
      end.lineWidth
    );
  }
}
