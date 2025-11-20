/**
 * Help Service
 * Provides centralized help modal initialization and content management
 */

(function() {
  const helpContentCache = {}; // Cache promises per mode
  let initialized = false;

  /**
   * Load help content from template file
   * @param {string} mode - Mode name ('vector', 'matrix', or 'tensor')
   * @returns {Promise<string>} Promise that resolves to help content HTML
   */
  async function loadHelpContent(mode = 'vector') {
    // Determine filename based on mode
    let filename = 'help-content-vector.html';
    if (mode === 'matrix') {
      filename = 'help-content-matrix.html';
    } else if (mode === 'tensor') {
      filename = 'help-content-tensor.html';
    }

    // Return cached promise if it exists
    if (helpContentCache[mode]) {
      return helpContentCache[mode];
    }

    // Create and cache the promise
    helpContentCache[mode] = (async () => {
      try {
        const response = await fetch(`./${filename}`);
        if (!response.ok) {
          throw new Error(`Failed to load help content: ${response.status}`);
        }
        return await response.text();
      } catch (error) {
        console.error(`Failed to load help content for mode '${mode}':`, error);
        return `<p>Help content could not be loaded. Please check that ${filename} exists.</p>`;
      }
    })();

    return helpContentCache[mode];
  }

  /**
   * Initialize the help modal with base content
   * Modes can append additional content using appendHelpContent()
   * @param {Object} options - Initialization options
   * @param {string} options.triggerSelector - CSS selector for help button
   * @param {string} [options.mode] - Mode name ('vector', 'matrix', or 'tensor'), defaults to 'vector'
   * @param {string} [options.additionalContent] - Additional HTML content to append
   * @param {string} [options.theme] - Theme mode ('auto', 'light', 'dark')
   * @returns {Promise<void>}
   */
  async function initializeHelpModal(options = {}) {
    if (initialized) {
      console.warn('Help modal already initialized');
      return;
    }

    const {
      triggerSelector = '#btn-help',
      mode = 'vector',
      additionalContent = '',
      theme = 'auto'
    } = options;

    try {
      let content = await loadHelpContent(mode);

      // Append mode-specific content if provided
      if (additionalContent) {
        content += additionalContent;
      }

      // Initialize help modal
      if (typeof HelpModal !== 'undefined') {
        HelpModal.init({
          triggerSelector,
          content,
          theme
        });
        initialized = true;
      } else {
        console.error('HelpModal class not found. Make sure help-modal.js is loaded before help.js');
      }
    } catch (error) {
      console.error('Failed to initialize help modal:', error);
      // Fallback initialization
      if (typeof HelpModal !== 'undefined') {
        HelpModal.init({
          triggerSelector,
          content: '<p>Help content could not be loaded.</p>',
          theme
        });
        initialized = true;
      }
    }
  }

  /**
   * Append additional content to the help modal
   * Useful for mode-specific help sections
   * @param {string} content - HTML content to append
   * @param {string} [mode] - Mode name ('vector', 'matrix', or 'tensor'), defaults to 'vector'
   * @returns {Promise<void>}
   */
  async function appendHelpContent(content, mode = 'vector') {
    if (!initialized) {
      console.warn('Help modal not initialized. Call initializeHelpModal() first.');
      return;
    }

    // Reload content and append new section
    const baseContent = await loadHelpContent(mode);
    const newContent = baseContent + content;

    // Reinitialize with updated content
    if (typeof HelpModal !== 'undefined') {
      HelpModal.init({
        triggerSelector: '#btn-help',
        content: newContent,
        theme: 'auto'
      });
    }
  }

  // Export to global scope
  window.HelpService = {
    initializeHelpModal,
    appendHelpContent,
    loadHelpContent
  };
})();

