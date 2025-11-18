/**
 * Config Loader
 * Handles loading and parsing of configuration from config.json
 */

(function() {
  let configCache = null;
  let configPromise = null;

  // Default configuration
  const DEFAULT_CONFIG = {
    mode: 'vector',
    vectorMode: {
      maxVectors: 2,
      operationGroups: {
        addition: true,
        scalarMultiplication: true,
        dotProduct: true,
        projectionAngle: true,
        normalization: true,
        perpendicular: true,
        reflection: true,
        linearCombination: true
      }
    },
    matrixMode: {
      maxMatrices: 2,
      includeVector: false,
      operationGroups: {
        determinant: true
      }
    }
  };

  /**
   * Load configuration from config.json
   * @returns {Promise<Object>} Configuration object
   */
  async function loadConfig() {
    if (configCache) {
      return configCache;
    }

    if (configPromise) {
      return configPromise;
    }

    configPromise = (async () => {
      // Emit loading status if StatusService is available
      if (window.StatusService) {
        window.StatusService.setLoading();
      }

      try {
        const response = await fetch('./config.json');

        if (!response.ok) {
          console.warn('config.json not found, using default configuration');
          const config = { ...DEFAULT_CONFIG };
          configCache = config;

          if (window.StatusService) {
            window.StatusService.setReady();
          }

          return config;
        }

        const userConfig = await response.json();

        // Merge with defaults
        const config = {
          mode: userConfig.mode || DEFAULT_CONFIG.mode,
          vectorMode: {
            ...DEFAULT_CONFIG.vectorMode,
            ...(userConfig.vectorMode || userConfig), // Backward compatible
            operationGroups: {
              ...DEFAULT_CONFIG.vectorMode.operationGroups,
              ...(userConfig.vectorMode?.operationGroups || userConfig.operationGroups || {})
            }
          },
          matrixMode: {
            ...DEFAULT_CONFIG.matrixMode,
            ...(userConfig.matrixMode || {}),
            operationGroups: {
              ...DEFAULT_CONFIG.matrixMode.operationGroups,
              ...(userConfig.matrixMode?.operationGroups || {})
            }
          }
        };

        configCache = config;
        console.log(`Configuration loaded successfully. Mode: ${config.mode}`);

        if (window.StatusService) {
          window.StatusService.setReady();
        }

        return config;
      } catch (error) {
        console.warn('Failed to load config.json, using default configuration:', error);
        const config = { ...DEFAULT_CONFIG };
        configCache = config;

        if (window.StatusService) {
          window.StatusService.setLoadFailed();
        }

        return config;
      }
    })();

    return configPromise;
  }

  /**
   * Get cached configuration (synchronous)
   * Returns null if config hasn't been loaded yet
   * @returns {Object|null} Configuration object or null
   */
  function getConfig() {
    return configCache;
  }

  /**
   * Clear configuration cache (useful for testing or reloading)
   */
  function clearCache() {
    configCache = null;
    configPromise = null;
  }

  // Export to global scope
  window.ConfigService = {
    loadConfig,
    getConfig,
    clearCache
  };
})();

