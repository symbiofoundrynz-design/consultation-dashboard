(function (global) {
  'use strict';

  const CCR = global.CCRVisual = global.CCRVisual || {};
  CCR.HostOptions = CCR.HostOptions || {};

  global.CCRVisualWorkbench = {
    version: CCR.Core.APP_VERSION,
    displayName: CCR.Core.DISPLAY_NAME,
    async loadCdashExport(data, options = {}) {
      CCR.HostOptions = {
        onReady: options.onReady,
        onImportComplete: options.onImportComplete,
        onError: options.onError,
        logoResolver: options.logoResolver
      };
      return CCR.UIController.loadRawData(data, options.sourceName || 'Host-supplied Cdash export', { persist: options.persist !== false });
    },
    getConfiguration() {
      return CCR.UIController.getState();
    },
    getNormalizedData() {
      return CCR.UIController.getData();
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await CCR.UIController.init();
      if (typeof CCR.HostOptions.onReady === 'function') CCR.HostOptions.onReady();
    } catch (error) {
      console.error('Graphs & Charts startup failed:', error);
      const status = document.getElementById('status-message');
      if (status) status.textContent = `Startup failed: ${error.message}`;
    }
  });
})(window);
