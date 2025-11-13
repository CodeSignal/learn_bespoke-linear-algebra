/**
 * Results Panel Class
 * Reusable component for displaying operation results in both vector and matrix modes
 * Handles formatted result display with consistent markup
 */

class ResultsPanel {
  /**
   * Create a ResultsPanel instance
   * @param {HTMLElement|string} rootElement - Root element or selector for results container
   * @param {string} [emptyMessage] - Message to show when panel is empty
   */
  constructor(rootElement, emptyMessage = 'Perform an operation to see results') {
    if (typeof rootElement === 'string') {
      this.root = document.querySelector(rootElement);
    } else {
      this.root = rootElement;
    }

    if (!this.root) {
      console.warn('ResultsPanel: root element not found');
      return;
    }

    this.emptyMessage = emptyMessage;
    this.clear();
  }

  /**
   * Display result lines in the panel
   * @param {...string} lines - One or more lines to display (can contain HTML)
   */
  show(...lines) {
    if (!this.root) return;

    if (lines.length === 0) {
      this.clear();
      return;
    }

    this.root.innerHTML = lines.map(line =>
      `<p class="formula">${line}</p>`
    ).join('');
  }

  /**
   * Clear the results panel
   */
  clear() {
    if (!this.root) return;

    this.root.innerHTML = `<p class="hint">${this.emptyMessage}</p>`;
  }

  /**
   * Get the root element
   * @returns {HTMLElement|null}
   */
  getRoot() {
    return this.root;
  }
}

