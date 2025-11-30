# Coding conventions

- **Layer discipline:** keep `core/` pure; put network/IO in `adapters/`; orchestration in `app/`; `entrypoints/` stay thin and delegate.
- **Type safety:** strict TypeScript; prefer explicit types over `any`. Use Zod to validate all external responses before they reach `core/`.
- **HTTP:** use the shared `createHttpClient`; always pass timeouts (default 10s), include a user agent, and surface non-2xx as `HttpRequestError` (no stringly errors).
- **Normalization/monitoring:** use `buildNormalizedItem` + `computeFingerprint` to create deterministic `NormalizedItem`s, and `computeChangeSet` to compare snapshots.
- **Errors:** extend `DomainError` for domain issues; `NormalizationError` for mapping failures; `HttpRequestError` for adapter errors. Include context (source id, status, url).
- **Dependency injection:** pass interfaces (e.g., `HttpClient`) into use-cases; avoid importing concrete adapters inside `core/`.
- **Logging:** keep entrypoints responsible for structured logging/telemetry; core/app should return data/errors. Replace `console` with a structured logger (e.g., pino) once added.
- **Config/secrets:** no inline secrets. Read from typed config objects/env parsing in entrypoints, then inject into adapters/app.
