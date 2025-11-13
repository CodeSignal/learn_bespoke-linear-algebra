/**
 * Help Service
 * Provides centralized help modal initialization and content management
 */

(function() {
  let helpContentPromise = null;
  let initialized = false;

  /**
   * Load help content from template file
   * @returns {Promise<string>} Promise that resolves to help content HTML
   */
  async function loadHelpContent() {
    if (helpContentPromise) {
      return helpContentPromise;
    }

    helpContentPromise = (async () => {
      try {
        const response = await fetch('./help-content-template.html');
        if (!response.ok) {
          throw new Error(`Failed to load help content: ${response.status}`);
        }
        return await response.text();
      } catch (error) {
        console.error('Failed to load help content:', error);
        return '<p>Help content could not be loaded. Please check that help-content-template.html exists.</p>';
      }
    })();

    return helpContentPromise;
  }

  /**
   * Initialize the help modal with base content
   * Modes can append additional content using appendHelpContent()
   * @param {Object} options - Initialization options
   * @param {string} options.triggerSelector - CSS selector for help button
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
      additionalContent = '',
      theme = 'auto'
    } = options;

    try {
      let content = await loadHelpContent();

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
   * @returns {Promise<void>}
   */
  async function appendHelpContent(content) {
    if (!initialized) {
      console.warn('Help modal not initialized. Call initializeHelpModal() first.');
      return;
    }

    // Reload content and append new section
    const baseContent = await loadHelpContent();
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

