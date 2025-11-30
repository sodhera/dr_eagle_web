# Backend functions and jobs (Firebase)

Track every Firebase function, scheduled job, or backend component here. Update this file whenever you add/change a Firebase resource.

## Firestore structure
- Collection: `system_docs`
  - Subcollection: `developer_docs`
  - Purpose: store developer/reference documents (e.g., contents of `Polymarket_dev_docs`, excluding scraper code).
  - Status: implemented. Sync via local script (`npm run sync:system-docs`) which writes each file as a doc under `system_docs/developer_docs/files`.

- Collection: `logs`
  - Purpose: Store structured activity logs for all user interactions, AI responses, MCP tool calls, and Python executions.
  - Retention: 30 days (auto-expiration via TTL field)
  - Status: Implemented (see `docs/logging-system.md` for complete documentation)
  - Dual-write: Logs are written to both Firestore (recent, queryable) and BigQuery (long-term analytics)

## Scheduled functions
- Name: `polymarketScrapeDaily`
  - Trigger: scheduled (every day at 00:01 AM UTC).
  - Purpose: run the Polymarket scraper logic (Python script moved into a Firebase Function), refresh docs, and persist outputs into `system_docs/developer_docs` (and/or Storage if artifacts are large). It diffs against existing Firestore content and only updates changed files / removes deleted ones.
  - Status: deployed (Node.js 20, us-central1) using Functions v2 scheduler; uses `functions/src/systemDocsSync.ts` to push docs into `system_docs/developer_docs` with folder subcollections and diffing.

## HTTP functions

- Name: `issueMcpToken`
  - Trigger: HTTPS (onRequest, `us-central1`).
  - Purpose: exchange a verified Firebase ID token for an MCP bearer token. Clients POST `{ idToken, scopes? }`; the function verifies Firebase auth, assigns role (admin if UID is in `ADMIN_USER_IDS`), filters requested scopes, and returns `{ token, claims }` for use against MCP functions.
  - Notes: uses `AuthService` and `resolveMcpScopes` to ensure only allowed scopes are granted; returns 401 on invalid Firebase tokens.

- Name: `execute-python-code` (Python runtime)
  - Trigger: HTTPS (HTTP function, `us-central1`).
  - Purpose: Execute arbitrary Python code in a sandboxed environment with strict security controls.
  - Runtime: Python 3.11
  - Timeout: 30 seconds
  - Memory: 512MB
  - Security:
    - Whitelist-only imports (`json`, `math`, `datetime`, `statistics`, `itertools`, `functools`, `collections`, `re`, `string`, `random`)
    - Restricted builtins (no `eval`, `exec`, `compile`, `open`, file system, or network access)
    - Custom `__import__` hook blocks dangerous modules
  - Input: `{ code: string, input_data?: object }`
  - Output: `{ success: boolean, output: string, error: string | null, execution_time_ms: number }`
  - Rate limiting: 10 executions per hour per user (enforced by MCP layer)
  - Status: Deployed

- Name: `agent`
  - Trigger: HTTPS (onRequest, `us-central1`)
  - Purpose: Main backend agent endpoint for chat interactions and tracker management.
  - Runtime: Node.js 20
  - Endpoints:
    - `POST /chat`: Start or continue a chat session with the AI agent
    - `GET /sessions`: List user's chat sessions
    - `GET /chat/:sessionId`: Retrieve a specific chat session
  - Features:
    - Uses `gpt-4.1-nano` model (OpenAI)
    - Full logging to Firestore and BigQuery
    - MCP tool registry including tracking tools
    - Authentication via bearer token (from `issueMcpToken`)
  - Status: Deployed

## Firestore Collections (Tracking System)

- Collection: `trackers`
  - Purpose: Store user-created trackers (market/event monitoring configurations)
  - Schema: see `src/core/tracking/types.ts` (`Tracker` interface)
  - Subcollections:
    - `subscriptions`: Users subscribed to this tracker
    - `runs`: Historical execution records
    - `snapshots`: Data snapshots from each run
  - Status: Implemented (Session 2)

- Collection: `tracker_notifications`
  - Purpose: Record all notifications sent to users about tracker events
  - Schema: see `src/core/tracking/types.ts` (`NotificationRecord` interface)
  - Status: Implemented (Session 2)

## MCP Tools (Tracking)

The following tracking tools are available through the agent's MCP registry:

- `create_tracker`: Create a new tracker for a target (Polymarket market, event, HTTP source, etc.)
- `list_trackers`: List all trackers owned by the authenticated user
- `run_tracker_now`: Manually trigger a tracker run
- `get_tracker_status`: Get status and last run timestamp for a tracker
- `update_tracker_mode`: Change a tracker's mode (regular/irregular)
- `subscribe_shared_tracker`: Subscribe to a shared tracker

See `src/mcp/tracking.ts` for implementation details.

## Background Jobs (Tracking)

- Name: `runDueTrackers` (not yet deployed as scheduled function)
  - Trigger: Intended for Cloud Scheduler (e.g., every 5 minutes)
  - Purpose: Execute all active trackers that are due based on their schedule
  - Implementation: `TrackingService.runDueTrackers()`
  - Status: Code implemented, awaiting Cloud Scheduler configuration

## Deployment notes
- Source of truth: this repo (backend/MCP). Deploy from GitHub `main` to Firebase.
- Ensure new functions declare env/secret dependencies (Polymarket/API keys) via secret manager, not in code.
- Update IAM rules to keep `system_docs` read-only to authorized roles and write-limited to the scheduled function and trusted maintainers. Firestore rules now restrict `system_docs/*/files` reads to `request.auth.token.role == 'admin'` and deny writes via client SDKs.
