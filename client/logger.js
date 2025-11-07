/**
 * Logger Utility
 * Simple logging system that sends user action messages to the server
 */

/**
 * Logs a user action message to the server
 * @param {string} message - The log message to record
 */
function logAction(message) {
  // Send log message to server
  fetch('/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  }).catch(() => {
    // Silent failure - don't disrupt user experience if logging fails
  });
}
