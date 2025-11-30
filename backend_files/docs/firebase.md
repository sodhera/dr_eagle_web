# Firebase system

Project: `audit-3a7ec` (Firebase backend + MCP hosting). Auth users are managed separately as needed.

## Purpose
- Host backend APIs/MCP tools for the Polymarket agent and related services (single polymarket-read MCP surface).
- Run serverless functions for authenticated workflows, data access, and MCP tool execution.
- Serve storage (if needed) for shared/admin data, logs, or exported artifacts.

## Current state
- Firestore collections cleared.
- Cloud Functions removed (`ssraudit3a7ec`, `scheduledUaeVisaScout`, `sendScoutUpdateEmail`, `setAdminRole`, `triggerUaeVisaScout`).
- Hosting disabled; secondary site removed; default site remains (cannot delete).
- Storage bucket currently absent/empty (`gs://audit-3a7ec.appspot.com`).
- Auth users managed manually (UI collaborator handles frontend repo separately).
- New structure defined: `system_docs/developer_docs/files` populated via sync script; scheduled function deployed to refresh nightly.
- Firestore rules lock `system_docs/*/files` to admin-only reads and deny writes from clients; functions use admin SDK to bypass.

## Structure (planned)
- **Functions**: Deploy MCP handlers and backend APIs (auth-gated). Keep tools small and typed; enforce timeouts; log structured events. 
  - `polymarketReadMcp` (HTTPS, us-central1): Single MCP surface for real-time, read-only Polymarket tools.
  - `webSearchMcp` (HTTPS, us-central1): Standalone MCP tool for web search using OpenAI. Uses `OPENAI_API_KEY` secret.
  - `issueMcpToken` (HTTPS, us-central1): Verifies a Firebase ID token and returns an MCP bearer token.
- **Firestore/Storage**: Only store necessary MCP/admin data with per-user isolation; no public writes.
- **Hosting**: Optional for MCP tooling dashboards; keep disabled until needed.
- **Secrets/config**: Use Firebase/Google Cloud Secret Manager; no inline secrets. Env keys include Polymarket/Firebase/Resend and Coinbase overrides (`COINBASE_BASE_URL`, `COINBASE_TIMEOUT_MS`) as per `.env.local`.

## Deployment
- Source of truth: this repo (backend/MCP). Pushes to GitHub `main` will trigger backend deploys to Firebase via CI/CD.
- CI/CD: `.github/workflows/firebase-deploy.yml` runs on `main` and manual dispatch. It installs deps, runs `npm run typecheck` + `npm test`, builds `functions`, then deploys `polymarketScrapeDaily` and `polymarketReadMcp` (single MCP surface). Auth uses a GCP service account key provided via repo secret `GCP_SA_KEY_B64`, decoded to `GOOGLE_APPLICATION_CREDENTIALS` in the workflow; `FIREBASE_PROJECT_ID` defaults to `audit-3a7ec`.
- Frontend/UI: lives in a separate repo maintained by the frontend collaborator; not deployed from here.

## Conventions
- Document any new function/MCP endpoint and associated security rules here.
- Keep per-environment notes (prod/stage) and resource locations when they are created.
- When adding a new Firebase resource (function, database, storage path), note its purpose, auth model, and limits.
