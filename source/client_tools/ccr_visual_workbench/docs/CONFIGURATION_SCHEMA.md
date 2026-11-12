# Graphs & Charts Configuration Schema

**Schema version:** 1

Exported configuration files use this envelope:

```json
{
  "schema_version": 1,
  "tool": "ccr_visual_workbench",
  "display_name": "Graphs & Charts",
  "app_version": "1.0.1",
  "exported_at": "2026-07-18T00:00:00.000Z",
  "source": {
    "name": "cdash-export.json",
    "latest_snapshot_date": "2026-07-17"
  },
  "configuration": {
    "dataset": "capabilities",
    "measure": "status_composition",
    "groupBy": "Product",
    "providerIds": [],
    "categories": ["Coding Agent"],
    "tags": ["Agent"],
    "tagMatch": "any",
    "productIds": null,
    "section": "Coding and Build Facts",
    "pricingBasis": "",
    "chartType": "stacked-bar",
    "sort": "value-desc",
    "title": "Coding Agent Capability Status",
    "subtitle": "Current accepted snapshots"
  }
}
```

## Product selection

`productIds: null`
: All products remaining after provider, category and tag filters.

`productIds: []`
: No products selected.

`productIds: ["product-id", ...]`
: Explicit product selection.

## Tag matching

`tagMatch: "any"`
: A product must contain at least one selected tag.

`tagMatch: "all"`
: A product must contain every selected tag.

## Pricing basis

A pricing basis combines exact currency and billing-period strings:

```text
USD|||MONTHLY
```

The tool chooses the largest comparable group when the configured basis is unavailable.

## Compatibility policy

- Unknown extra configuration fields are ignored by the current UI.
- A missing or different `tool` value is rejected.
- Any `schema_version` other than `1` is rejected with a visible warning.
- Future migrations should add explicit adapters rather than guessing field meaning.
