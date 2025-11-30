# Testing strategy

- **Fast checks:** run `npm run typecheck` before pushing. Add unit/integration tests as soon as behavior appears.
- **Unit tests (core):** cover pure logic (e.g., `computeFingerprint`, `buildNormalizedItem`, `computeChangeSet`) with deterministic fixtures. No network or timers.
- **Integration tests (adapters):** test `HttpClient` against mocked servers (MSW, nock, or local `http` server). Never hit real third-party APIs in CI; record fixtures if needed.
- **Use-case tests (app):** exercise `fetchSourceSnapshot` and `detectSourceChanges` with fake adapters and Zod schemas to assert orchestration and error mapping.
- **End-to-end/smoke:** once real entrypoints exist, add a minimal health/smoke test that boots the process with test config and asserts readiness.
- **Fixtures/layout:** keep test helpers under `test/` with `fixtures/` for canned payloads. Prefer scenario-focused test names and explicit expectations.
