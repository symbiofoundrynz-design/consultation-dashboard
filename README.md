# Consultation Dashboard — engineering portfolio v0.2

**SymbioFoundry | AI evaluation and client consultation decision-support | Work in progress**

This project standardizes AI-product research into reviewed structured records, then aims to connect those records to client needs questionnaires and a recommendation workflow. The platform is an active systems-engineering project; the final consultation and matching pipeline is not complete.

## What's inside

- `source/` — dashboard frontend, Python/FastAPI backend source, AI EcoSphere visualisation and Graphs & Charts workbench
- `source/client_tools/ccr_visual_workbench/` — standalone visualization engine and Apache ECharts dependency (license retained)
- `source/client_tools/ai_ecosphere_v1_0_1/` — interactive product/provider visualization and a sample data adapter
- `docs/` — architecture, status, evidence, package-specific changes and publication boundary

## Run a safe local preview

Requires Python 3 or Node.js. The static preview does **not** connect to MAINFORGE or PostgreSQL. From the repository root:

```bash
cd source
python3 preview.py
# or: node local-server.js
```

Open `http://127.0.0.1:8765/`. The root application falls back to local browser storage when no API is present. **Do not enter real client data in a demonstration browser.**

From the dashboard, open **AI EcoSphere** to explore provider and product relationships. In **Graphs & Charts**, select **Use Sample Data** in the start dialog and build **Products by category**. The workbench sample contains eight fictional products.

## Real deployed architecture

The operational version uses a Python/FastAPI backend, PostgreSQL and a browser UI. This package includes `source/server.py` for source review. The production DB schema, database, credentials, user data and deployment configuration are excluded.

## Current scope and status

Research primer and parsing, provider/product registry, accepted snapshots, comparison matrix, client and consultant registries, and selected visual tools have been implemented. Separate questionnaires have been built but are not included in this particular historical release. The integrated Client Consultation Room and recommendation engine are unfinished.

See [Architecture](docs/ARCHITECTURE.md), [Status](docs/DEVELOPMENT_STATUS.md), [Verification](docs/VERIFICATION.md), and [Publication Boundaries](docs/PUBLICATION_BOUNDARIES.md).

## Engineering work

Systems design, modular requirements analysis, integration, troubleshooting, test planning, deployment verification and AI-assisted software development. The source was built with AI assistance under developer direction and review.

**Private source review.** DeV approved this version for a private repository. Public release requires a separate decision. The original project retains its existing copyright. The bundled ECharts distribution has its own [third-party notices](source/client_tools/ccr_visual_workbench/THIRD_PARTY_NOTICES.md).
