/**
 * Status Service
 * Provides centralized status message management for the application
 */

(function() {
  const statusElement = document.getElementById('status');

  if (!statusElement) {
    console.warn('Status element not found. Status messages will not be displayed.');
  }

  /**
   * Set the status message
   * @param {string} message - Status message to display
   */
  function setStatus(message) {
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  /**
   * Set status to "Loading..."
   */
  function setLoading() {
    setStatus('Loading...');
  }

  /**
   * Set status to "Saving..."
   */
  function setSaving() {
    setStatus('Saving...');
  }

  /**
   * Set status to "Ready"
   */
  function setReady() {
    setStatus('Ready');
  }

  /**
   * Set status to "Save failed (will retry)"
   */
  function setSaveFailed() {
    setStatus('Save failed (will retry)');
  }

  /**
   * Set status to "Changes saved"
   */
  function setChangesSaved() {
    setStatus('Changes saved');
  }

  /**
   * Set status to "Failed to load data"
   */
  function setLoadFailed() {
    setStatus('Failed to load data');
  }

  /**
   * Set status to "Auto-save initialized"
   */
  function setAutoSaveInitialized() {
    setStatus('Auto-save initialized');
  }

  // Export to global scope
  window.StatusService = {
    setStatus,
    setLoading,
    setSaving,
    setReady,
    setSaveFailed,
    setChangesSaved,
    setLoadFailed,
    setAutoSaveInitialized
  };
})();

