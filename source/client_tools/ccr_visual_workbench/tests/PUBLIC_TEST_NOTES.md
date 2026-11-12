# Public test fixture note

`run-tests.mjs` is the original test harness and contains assumptions about the archived research fixture. The archived fixture is **not** distributed here. Some assertions may therefore fail against the newly generated synthetic sample even when the implementation is correct. Use `public-smoke.mjs` for the public-package smoke test; do not describe historical tests as newly passing without rerunning them against an approved fixture.
