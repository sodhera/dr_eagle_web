# Architecture

Backend service written in TypeScript (Node 18+) to track third-party APIs, normalize their data, monitor for changes, and hand results to an AI agent layer (not yet implemented here). The codebase is layered for clear boundaries and testability.

## Layout
- `src/core/` – Pure domain logic: data shapes, normalization helpers, change detection (`computeChangeSet`), deterministic hashing (`computeFingerprint` / `buildNormalizedItem`). `agent/` defines `ChatSession`, `Message`, and `Agent` interfaces. `search/` defines web search types and validation. No I/O.
- `src/adapters/` – Outbound dependencies. `http/` with a typed `HttpClient`. `openai/` implements the Agent interface and `WebSearchClient`. `firestore/` implements `ChatRepository`. `mcp/` implements `InternalToolRegistry` to expose tools to the agent.
- `src/app/` – Use-cases/orchestration. `tracking/` holds `SourceDefinition` and use-cases. `auth/` issues/validates tokens. `agent/` orchestrates the chat loop, tool execution, and persistence. `polymarketRead/` hosts the real-time Polymarket agent. `search/` orchestrates web search.
- `src/config/` – Env parsing for typed runtime config.
- `src/mcp/` – MCP server definitions with tool schemas.
- `src/entrypoints/` – Execution surfaces. `http-server.ts` exposes health and MCP endpoints. `agent.ts` exposes `/chat` endpoints via Firebase Functions.

## Data flow (ingestion + monitoring)
1) A `SourceDefinition` declares the API endpoint, headers/query, Zod schema, and a normalization function that returns `NormalizedItem[]`.
2) `app/tracking/fetchSourceSnapshot` uses the shared `HttpClient` to fetch with timeouts, parses via Zod, then normalizes.
3) `app/tracking/detectSourceChanges` compares the new snapshot to prior normalized items with `computeChangeSet`, producing typed change events.
4) Downstream persistence/notification layers are not yet implemented; add them as new adapters (storage/queues) and app use-cases that remain thin entrypoints.

## Runtime/config
- Node 18+, strict TypeScript. Build with `npm run build`; type-check with `npm run typecheck`.
- HTTP defaults: 10s timeout, explicit user agent (`tracking-agents-backend/0.1`), JSON parsing by default.
- Entry HTTP server binds to `PORT` (default 3000) and exposes `/health`, `/oauth/token`, `/markets`, `/markets/:id/pricing`, `/analysis/weekly-movement`, `/me/space`, `/admin/space`, MCP discovery endpoint (`/mcp/polymarket-read/tools`), and MCP tool executor (`/mcp/polymarket-read/run`) for the unified server surface.
- Agent API: Exposes `POST /chat` and `GET /chat/:sessionId` via Firebase Functions, authenticated via Bearer tokens.
- Auth: HMAC-signed bearer tokens issued via `/oauth/token` using `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_SIGNING_KEY`, `AUTH_TOKEN_TTL_SECONDS`, and `ADMIN_USER_IDS`.
- Polymarket adapters use `POLYMARKET_API_KEY`/`POLYMARKET_SECRET`/`POLYMARKET_PASSPHRASE` when provided for authenticated access; defaults to public endpoints otherwise. `polymarketRead` additionally uses `POLYMARKET_DATA_API_URL` and `POLYMARKET_RTDS_URL` for Data API and RTDS WebSocket streaming. Market-data adapter calls Coinbase spot prices (no auth) with per-tier caching guidance; exposed via `polymarket-read` composites.
