// app.js
(function() {
  let websocket = null;

  // Initialize WebSocket connection
  function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    try {
      websocket = new WebSocket(wsUrl);

      websocket.onopen = function(event) {
        console.log('WebSocket connected');
        if (window.StatusService) {
          window.StatusService.setReady();
        }
      };

      websocket.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message' && data.message) {
            alert(data.message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = function(event) {
        console.log('WebSocket disconnected');
        if (window.StatusService) {
          window.StatusService.setReady();
        }

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          initializeWebSocket();
        }, 3000);
      };

      websocket.onerror = function(error) {
        console.error('WebSocket error:', error);
        if (window.StatusService) {
          window.StatusService.setReady();
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      if (window.StatusService) {
        window.StatusService.setReady();
      }
    }
  }

  // Initialize both help modal and WebSocket when DOM is ready
  async function initialize() {
    // Initialize help modal using shared service
    if (window.HelpService) {
      await window.HelpService.initializeHelpModal({
        triggerSelector: '#btn-help',
        theme: 'auto'
      });
    }

    initializeWebSocket();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
