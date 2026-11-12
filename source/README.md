# Cdash v1 Core

First ANVIL build from `CDASH_V1_BLUEPRINT.md`.

From the repository root, run the local preview server:

```powershell
node source/local-server.js
```

Then open:

```text
http://127.0.0.1:8765/index.html
```

This build is intentionally simple:

- Registry with provider/product parent-child entries.
- Primer Library prompt shelf.
- Test Recorder manual diary.
- Data Parser for pasted or uploaded Markdown snapshots.
- Current Matrix from accepted current snapshots.
- Records page for backup/export/import/reset.

Storage is local browser storage shaped to match `CDASH_DATABASE_SHAPE_v1.0.md`.
Server database integration can replace this storage layer later without changing the core workflow screens.
