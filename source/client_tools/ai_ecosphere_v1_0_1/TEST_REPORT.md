# AI EcoSphere V1.0.1 Test Report

**Version:** 1.0.1  
**Build folder:** `ai_ecosphere`  
**Classification:** Internal consultation and education tool

## Patch scope

V1.0.1 changes only the idle presentation behaviour:

- After 10 seconds without interaction, the unselected cloud begins a slow horizontal rotation.
- Idle rotation pauses on node hover, node selection, drag, open information sheet, reduced-motion preference, or manual ambient-motion disable.
- Rotation resumes after hover ends when no other pause condition remains.
- The renderer, normalized data contract, assets, hierarchy, selection behaviour, and information sheet remain unchanged.

## Static validation

- JSON syntax: PASS
- JavaScript syntax (`node --check`): PASS
- HTML parse: PASS
- Providers loaded from fixture: 10
- Products loaded from fixture: 14
- Referenced SVG assets found: 24
- Runtime provider/product IDs unique: PASS
- Product `provider_id` relationships: PASS
- Renderer uses `loadMatrixData()`: PASS
- Renderer contains no SQL, database table names, or database-row reshaping: PASS
- SHA-256 manifest verification: PASS

## Browser-level patch acceptance

Headless Chromium exercised the assembled package at 1366 × 768 and 1920 × 1080 through an intercepted static-resource harness.

Verified:

- All 24 graph nodes rendered.
- Idle rotation remained off before the configured 10-second delay.
- Idle rotation began after the configured delay.
- Yaw changed continuously during idle rotation.
- Hover paused idle rotation.
- Rotation resumed after hover ended.
- Node selection paused idle rotation.
- Open information sheet paused idle rotation.
- Manual ambient-motion disable stopped idle rotation.
- Operating-system reduced-motion preference stopped idle rotation.
- Existing information-sheet interaction remained operational.
- Existing graph rendered at both approved desktop resolutions.

## Regression status

The V1.0.0 visual and interaction architecture was not otherwise altered. The existing controls, data adapter boundary, asset paths, node hierarchy, collision correction, and standalone launch scripts remain in place.

## Test-environment note

The container's Chromium policy blocks direct navigation to localhost and synthetic domains. Browser tests therefore loaded the exact package HTML, CSS, JavaScript, configuration, and fixture through an intercepted static-resource harness. The included Python local-server launcher was separately verified to serve the package over HTTP.

## Manual review still required

- Confirm the selected idle speed feels appropriately slow on DeV's normal display.
- Confirm hover pause feels immediate with a physical mouse.
- Confirm the page retains the intended visual balance during several minutes of continuous rotation.
