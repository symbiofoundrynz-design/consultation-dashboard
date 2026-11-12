# Graphs & Charts V1.0.1 Test Report

**Test date:** 2026-07-18 NZST  
**Build mode:** Standalone static package

## V1.0.1 hotfix review

- Fixed starter preset application so changing presets updates the dataset, measure, chart type and suggested title together.
- Re-ran packaged logic tests after the hotfix.
- Browser-verified all six starter presets as distinct charts against the bundled sample fixture after the hotfix.

## Completed checks

### Source and syntax

- All JavaScript files passed `node --check`.
- HTML references resolve to packaged local files.
- No runtime CDN dependency is present.
- The sanitised fixture contains no Private Iron Tailscale address.
- Apache ECharts and its licence notice are bundled locally.

### Logic test matrix

`tests/run-tests.mjs` passed against:

- the sanitised eight-product fixture;
- the full internal 22-product Cdash export.

Full-export normalization result used during testing:

- 22 products;
- 22 selected current snapshots;
- 1,891 capability facts;
- 881 product/tool/connector/recent-change list items.

Verified cases:

- all six editable presets;
- vertical and horizontal bars;
- grouped and stacked bars;
- pie and doughnut;
- heatmap;
- radar;
- scatter;
- treemap;
- configuration compatibility matrix;
- missing optional arrays;
- broken provider joins;
- malformed and duplicated tags;
- legacy `Base paid tier` aliases;
- unsupported configuration schema rejection;
- full-export import and preset generation.

### UI smoke test

A JSDOM integration smoke test passed with a stubbed ECharts renderer:

- page startup;
- host API registration;
- Sample Data action;
- eight-product fixture import;
- builder enablement;
- Build Chart action;
- chart workspace activation;
- source provenance line;
- evidence-table rendering;
- no UI runtime errors reported by JSDOM.

## Not claimed as completed

A real interactive browser visual inspection and actual PNG download were not completed inside the build container because its Chromium runtime cannot open local or loopback pages under the available container restrictions. The ECharts options and PNG export code are present, but the handoff lane should perform the following manual acceptance checks in a normal desktop browser:

1. Open `index.html`.
2. Load Sample Data.
3. Build each preset.
4. Confirm hover tooltips, legend toggling and zoom controls.
5. Export and inspect a 1600 × 900 PNG.
6. Export/import a configuration JSON.
7. Export and inspect filtered CSV evidence.
8. Reload the page and confirm browser persistence.
9. Repeat with the latest full Cdash export.
10. Check Chrome, Edge and Firefox at desktop width and one tablet-width layout.

No deployment or Cdash integration was performed in this lane.
