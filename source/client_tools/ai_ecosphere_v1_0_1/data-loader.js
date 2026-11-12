"use strict";

/**
 * The only runtime data-source function used by the visual engine.
 * Development loads a static fixture. Production can replace only this
 * function so long as it returns the same normalized object shape.
 */
async function loadMatrixData() {
  const sources = ["/api/registry-matrix", "mock-registry-matrix.json"];
  let lastError = null;

  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`${source} returned HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      lastError = error;
      if (source !== sources[sources.length - 1]) continue;
    }
  }

  throw new Error(`Matrix data request failed: ${lastError.message}`);
}
