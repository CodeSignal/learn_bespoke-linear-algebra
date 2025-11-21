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
    // Determine the current mode from config
    let mode = 'vector'; // Default to vector mode
    if (window.ConfigService) {
      try {
        const config = await window.ConfigService.loadConfig();
        mode = config.defaultMode || config.mode || 'vector'; // Support both new and old config format
      } catch (error) {
        console.warn('Failed to load config for help modal, using default mode:', error);
      }
    }

    // Initialize help modal using shared service
    if (window.HelpService) {
      await window.HelpService.initializeHelpModal({
        triggerSelector: '#btn-help',
        mode: mode,
        theme: 'auto'
      });

      // Subscribe to mode changes to update help content
      if (window.ModeManager && typeof window.ModeManager.onModeChange === 'function') {
        window.ModeManager.onModeChange(async (newMode) => {
          try {
            if (window.HelpService && typeof window.HelpService.updateHelpContent === 'function') {
              await window.HelpService.updateHelpContent(newMode);
            }
          } catch (error) {
            console.error('Failed to update help content on mode change:', error);
            if (window.StatusService) {
              window.StatusService.setReady();
            }
          }
        });
      }
    }

    initializeWebSocket();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
