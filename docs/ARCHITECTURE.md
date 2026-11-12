# Architecture

```mermaid
flowchart TD
 A[Standardized AI research] --> B[Primer and test records]
 B --> C[Parser and human acceptance]
 C --> D[(Provider/product registry and accepted snapshots)]
 D --> E[Current comparison Matrix]
 D --> F[AI EcoSphere visualization]
 G[Standalone client questionnaires] --> H[Requirements and constraints]
 D -. future integration .-> I[Matching and weighting]
 H -. future integration .-> I
 I -. planned .-> J[Reviewed recommendations and takeaway]
```

## Implementation

- Frontend: HTML, CSS, vanilla JavaScript
- Server-side architecture: Python/FastAPI and PostgreSQL using `psql` integration
- Visual workbench: JS with bundled Apache ECharts 6.1.0
- EcoSphere: standalone browser visualisation consuming normalized matrix data
- Local-preview fallback: browser storage, **not equivalent to the deployed PostgreSQL-backed workflow**

The architecture reflects a mixture of completed elements and planned integration. Dashed connections are not implemented in the inspected deployed core.
