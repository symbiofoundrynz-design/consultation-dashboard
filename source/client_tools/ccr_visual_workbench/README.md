# Graphs & Charts

**Technical folder:** `ccr_visual_workbench`  
**Version:** `1.0.1`  
**Classification:** Internal standalone Cdash integration component  
**Public URL:** None  
**Support/contact identity:** TBC by the main Cdash build lane

Graphs & Charts is a standalone static web tool for turning a Cdash backup JSON export into guided, traceable charts. It does not connect to the live database, make external data requests, convert currencies, score products, or make recommendations.

## V1.0.1 hotfix

This package fixes starter preset application so the selected dataset, measure, chart type and suggested title all refresh together before chart building.

## Run it

Open `index.html` in a current Chrome, Edge, or Firefox browser.

1. Choose **Use Sample Data** or **Load Cdash Export**.
2. Select a preset or configure a dataset, measure, filters, grouping and chart type.
3. Press **Build Chart**.
4. Inspect the evidence drawer before exporting.

For the most reliable browser storage behaviour, serve the folder through the same local/static web host used by Cdash. Direct double-click operation is also supported; browser privacy settings may restrict persistence for `file://` pages.

## Included capabilities

- Six normalized datasets: product registry, pricing, capability facts, platforms/interfaces, tools/connectors, and research quality.
- Guided compatibility between measures and chart types.
- Category, provider, product and Any/All tag filters.
- Bar, grouped bar, stacked bar, pie, doughnut, heatmap, radar, scatter, treemap and table views.
- Strict like-for-like pricing comparisons.
- Six editable starter presets.
- Named saved configurations in IndexedDB.
- PNG, versioned configuration JSON and filtered evidence CSV exports.
- Plain-text import handling, data-health warnings and accepted-with-warnings snapshot fallback.
- Accessible controls, chart text summaries and evidence tables.

## Package layout

```text
ccr_visual_workbench/
├── index.html
├── styles.css
├── js/
│   ├── app.js
│   ├── chart-builder.js
│   ├── core.js
│   ├── data-adapter.js
│   ├── dataset-registry.js
│   ├── exporters.js
│   ├── storage.js
│   └── ui-controller.js
├── vendor/
│   ├── echarts.min.js
│   └── VERSION.txt
├── fixtures/
│   ├── cdash-export-sample.json
│   └── cdash-export-sample.js
├── docs/
├── licenses/
└── tests/
```

The `.json` fixture is the human-readable sample. The matching `.js` wrapper allows Sample Data to work when `index.html` is opened directly without a web server.

## Host integration

The host-facing API is exposed as:

```js
await window.CCRVisualWorkbench.loadCdashExport(cdashData, {
  sourceName: "current-cdash-export.json",
  persist: true,
  onReady() {},
  onImportComplete(summary) {},
  onError(error) {}
});
```

See `docs/CCR_VISUAL_WORKBENCH_HANDOFF.md` for the integration contract.

## V1 exclusions

- No direct database or live API connection.
- No multi-chart dashboard canvas.
- No PDF report composer.
- No currency conversion.
- No weighted scoring or recommendation engine.
- No external CDN or chart service.
- No arbitrary formula language.
- No automatic data repair.

## Testing

Run the packaged logic tests:

```bash
node tests/run-tests.mjs
```

To additionally test against a full Cdash export:

```bash
FULL_EXPORT=/path/to/cdash-export.json node tests/run-tests.mjs
```

See `docs/TEST_REPORT.md` for completed verification and remaining manual checks.
