# CCR Visual Workbench Handoff

**Display name:** Graphs & Charts  
**Folder:** `ccr_visual_workbench`  
**Version:** 1.0.1  
**Integration owner:** Main Cdash build lane

## 1. Purpose

This package is a complete standalone static tool. The main Cdash lane should integrate it as a menu route/page without rewriting the chart engine.

V1.0.1 includes a small starter-preset refresh fix found during standalone live-browser review.

The standalone input path uses a user-selected Cdash backup JSON file. The host input path accepts the already parsed JSON object through a documented function.

## 2. Integration boundary

The tool does not:

- call the Cdash API;
- query PostgreSQL;
- write to Cdash;
- require credentials;
- assume a server route;
- fetch external chart code or product logos.

The host supplies data and may optionally supply callback functions.

## 3. Host API

```js
await window.CCRVisualWorkbench.loadCdashExport(data, options);
```

### Arguments

`data`
: Parsed Cdash export object containing at least `providers`, `products`, and `snapshots` arrays.

`options.sourceName`
: Human-readable source filename used in provenance lines.

`options.persist`
: Defaults to `true`. When true, the imported object is retained in IndexedDB.

`options.onReady`
: Optional callback fired after the tool UI is initialized.

`options.onImportComplete`
: Optional callback receiving the import-health summary after successful validation.

`options.onError`
: Optional callback receiving import or build errors.

`options.logoResolver`
: Reserved integration hook. V1 does not automatically request product logos; the standalone interface uses initials. A later host adapter may resolve approved local assets without changing the chart engine.

### Additional host reads

```js
window.CCRVisualWorkbench.getConfiguration();
window.CCRVisualWorkbench.getNormalizedData();
```

## 4. Recommended Cdash route integration

1. Copy the folder into the Cdash static module or route location.
2. Preserve relative paths inside the package.
3. Add the dashboard menu label **Graphs & Charts**.
4. Load the route normally.
5. Supply the current export object through `loadCdashExport()` when the host has it, or retain the built-in file input.
6. Apply Cdash theme overrides through the CSS variables in `:root` rather than editing chart logic.
7. Keep `vendor/echarts.min.js` and the Apache licence notice together.

## 5. Data adapter contract

Required arrays:

- `providers`
- `products`
- `snapshots`

Optional arrays, treated as empty when missing:

- `primers`
- `test_runs`
- `test_run_products`
- `snapshot_pricing`
- `snapshot_facts`
- `snapshot_list_items`

Snapshot rule:

1. Select the latest `Accepted` snapshot for each product.
2. When no accepted snapshot exists, select the latest `Accepted with warnings` snapshot.
3. Exclude products without either status from evidence datasets and report them in data health.

Taxonomy rule:

- Categories and tags are filtering/grouping metadata.
- Capability and pricing facts remain the evidence source.
- Tags are trimmed, deduplicated case-insensitively and normalized into arrays.

Pricing rule:

- Raw source strings are retained.
- Numeric charts accept only plain numeric values.
- Currency and billing period must match exactly.
- `QUOTE`, `UNKNOWN`, `NONE`, `USAGE_BASED`, descriptive prices and mismatched bases are excluded with visible reasons.
- Legacy `Base paid tier` fields normalize to `Entry paid tier` aliases.

## 6. Security model

- Imported values are rendered with DOM `textContent`.
- ECharts tooltips use rich-text mode rather than imported HTML.
- Imported scripts or HTML are never executed.
- Product websites and logo paths are not requested automatically.
- Unknown extra JSON fields are ignored, not interpreted.
- Invalid imports are validated before replacing the active dataset.

## 7. Storage

- Imported data and saved named configurations use IndexedDB database `ccr_visual_workbench`.
- Small interface preferences may use `localStorage`.
- A memory fallback prevents application failure when browser storage is blocked, but persistence then lasts only for the page session.
- **Forget loaded data** clears the retained import.
- **Clear saved charts** clears configurations without clearing the import.

## 8. Integration acceptance checks

- Menu route opens without a console error.
- Host data loads through `loadCdashExport()`.
- Data-health count matches the supplied export.
- Each of the six presets builds.
- PNG, configuration JSON and filtered CSV download correctly.
- Browser reload restores retained data when persistence is enabled.
- Cdash navigation and page styling remain unaffected outside this module.
