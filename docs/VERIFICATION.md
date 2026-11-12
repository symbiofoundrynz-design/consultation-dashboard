# Verification evidence and limitations

## Archive evidence

- Source: `consultation-dash-20260723-133753.zip`
- Historical release archive SHA-256 preserved in `docs/SOURCE_PROVENANCE.json`.
- MAINFORGE service was active and the application root returned HTTP 200 on November 11, 2026.
- Playwright inspection confirmed menus, AI Registry controls, Data Parser controls, Current Matrix, client registry controls and embedded AI EcoSphere.
- Historical archived visual test reports are retained in component subdirectories; these are historical evidence, not tests rerun against this sanitized package.

## Changes specific to the portfolio package

- Excluded archived workbench export fixture and substituted synthetic data.
- Replaced third-party product/provider logos with neutral SVG placeholders at identical relative paths.
- Removed stale per-component manifests and compiled Python bytecode.
- Converted production-specific server filesystem paths to optional local environment configuration.
- Replaced local launch helper with an isolated static server.
- Corrected relative portfolio-demo URLs for assets and component links.

## Packaged static preview

The originating lane recorded a conditional pass on 11 November 2026. In an isolated Windows test environment the dashboard loaded in a loopback Python preview, navigation worked, and the app used local browser storage when static API requests returned 404. The standalone AI EcoSphere displayed 10 provider nodes and 14 product nodes. In the standalone chart workbench the reviewer selected **Use Sample Data** and built **Products by category** from eight synthetic products.

## What remains

- Backend integration tests in a disposable database. **Do not run the bundled backend against any live database.**
- End-to-end consultation and matching, cross-browser testing, a full security review, accessibility conformance and performance testing.
- Third-party notice and trademark review before public publication.
- Separate owner approval for public release.

No production configuration, credentials, client data or live database exports are intentionally bundled.
