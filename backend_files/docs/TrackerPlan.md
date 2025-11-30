# TrackerPlan

Blueprint for introducing a Tracking MCP server plus the “Tracker-AI” agent that builds/evaluates trackers and dispatches notifications. This plan follows the repo layering (core/app/adapters/entrypoints) and assumes Firebase Functions + Firestore remain the execution and persistence surfaces.

## Scope and goals
- Allow each user to maintain personal trackers and subscribe to shared trackers.
- Support two analysis modes per tracker: computational (Python snippet) and AI-driven (LLM + persona context).
- Respect two notification styles: `regular` (send on schedule regardless of change) and `irregular` (send only when analysis triggers).
- Keep tracker state and conversation history separate from main chat sessions while reusing auth, logging, and MCP auth gates.

## Guiding principles
- Layer discipline: pure domain types/logic in `core/tracking`, orchestration in `app/tracking`, external concerns in `adapters/*`, thin MCP/server entrypoints.
- Strict authz: enforce user isolation and explicit sharing; no cross-tenant access without explicit subscription to a shared tracker.
- Deterministic change detection: reuse `computeChangeSet` + `NormalizedItem` to avoid duplicate notifications.
- Observability: dual-write logs (Firestore/BigQuery) for tracker actions, executions, and notifications using the existing `LoggingService`.
- Safety: sandbox Python via the existing `execute-python-code` function; timeouts on all HTTP calls; retry only idempotent fetches; no inline secrets.

## Two-session delivery

### Session 1: Foundation (storage, scheduling hooks, MCP surface)
- [x] Finalize domain model and pure helpers in `core/tracking` (types, normalization, change detection, `shouldNotify`, subscription merge).
- [x] Implement Firestore adapter for trackers, subscriptions, snapshots, and runs; enforce ACL in app layer; add LoggingService events for tracker mutations and runs.
- [x] Add scheduler adapter and scheduled function to enqueue per-tracker runs; Task handler to invoke `runTrackerOnce` with stubbed analyzers.
- [x] Ship `tracking` MCP server exposing `create_tracker`, `list_trackers`, `run_tracker_now`, `get_tracker_status`; include Zod schemas and auth checks.
- [x] Wire `app/tracking` use-cases for create/update/subscribe/list/run-now with fake/anemic analyzer + notifier (no AI/persona yet) so end-to-end tracker creation and execution works with stored snapshots and change detection.
- [x] Tests: unit tests for core helpers; integration tests for app use-cases with fake adapters; contract tests for MCP tool schemas.

### Session 2: Analysis, Notifications, and Tracker-AI (Complete)
- [x] **Computational Analysis**: Implement `PythonExecutionClient` integration in `TrackingService`.
- [x] **AI Analysis**: Implement `OpenAIAdapter` integration for `ai` analysis type.
- [x] **Notification Dispatch**: Implement `dispatchNotifications` logic (store record + log).
- [x] **Scheduler Adapter**: Implement `runDueTrackers` and `listAllActiveTrackers`.
- [x] **HTTP Sources**: Implement `TrackingDataFetcher` for Polymarket/HTTP.
- [x] **Remaining MCP Tools**: `update_tracker_mode`, `subscribe_shared_tracker`.
- [x] **Frontend Docs**: Update `ForFrontend.md` with tracking system details.
- [x] **Testing**: Verify build and unit tests.

## Domain model (core/tracking)
- `TrackerId`, `UserId`, `SpaceId` (tracker space distinct from chat space).
- `Tracker`:
  - `ownerId`
  - `visibility`: `personal` | `shared` (shared has `createdBy`, `allowedRoles`, `defaultSchedule`)
  - `target`: typed union (e.g., `polymarketMarket`, `substackFeed`, `httpSource`, `composite` with dependencies list)
  - `mode`: `regular` | `irregular`
  - `analysis`: `computational` (threshold/config + python template id) | `ai` (prompt template id, persona refs, input projection rules)
  - `schedule`: cron/interval for regular runs; for irregular, minimal heartbeat to refresh context plus event-based triggers from change detection
  - `notification`: channels (initially MCP callback + future email/push), rate limits, quiet hours
  - `status`: `active` | `paused` | `error`
- `Subscription`: `{ trackerId, userId, role: owner|viewer, deliveryPrefs }`
- `Snapshot`: normalized items + fingerprint; `ChangeEvent` reused from `computeChangeSet`.
- `AnalysisResult`: `{ trackerId, runId, type: computational|ai, summary, triggered, footnote }`
- `NotificationRecord`: audit of what was sent to whom and why (trigger vs scheduled).

## Components by layer
- **core/tracking**: types above; pure helpers to:
  - project raw source payloads into `NormalizedItem[]`
  - derive `ChangeEvent[]` and decide `shouldNotify` for `regular` vs `irregular`
  - merge subscriptions and compute delivery set for shared trackers
- **adapters**:
  - `trackingStore` (Firestore): trackers, subscriptions, snapshots, analysis results, notification records per user space; composite trackers store dependency graph; enforce owner/subscriber ACL.
  - `trackingScheduler` (Cloud Tasks or Functions scheduler): enqueue per-tracker runs (`regular` cadence) and “change detected” jobs for irregular trackers.
  - `trackingHttpSources`: fetchers for specific targets (Polymarket, Substack) using shared `HttpClient` with 10s timeout; schema-validated via Zod before normalization.
  - `pythonExecutor`: thin wrapper around the deployed `execute-python-code` HTTPS function with per-user rate limit; injects sanitized input only.
  - `llmAnalyzer`: uses OpenAI adapter with user persona + tracker prompt; separate “tracker space” conversation ids stored in Firestore.
  - `notifier`: adapter to call MCP/webhook endpoint for now; later fan out to email/push via dedicated providers.
- **app/tracking**:
  - `createTracker`/`updateTracker`/`subscribeTracker`/`listTrackers` use-cases with auth checks.
  - `runTrackerOnce` orchestrates: resolve target, fetch snapshot, detect changes, run analysis, produce `AnalysisResult`, and emit `NotificationRequest` objects.
  - `dispatchNotifications` consumes `NotificationRequest` and writes `NotificationRecord`, then calls notifier adapter.
  - `buildTrackerPythonTemplate` to constrain generated code (simple, deterministic; no dynamic imports).
  - `TrackerAiService` to prepare prompts, inject persona, and summarize results/footnotes.
- **entrypoints**:
  - New MCP server `tracking` exposing tools: `create_tracker`, `list_trackers`, `update_tracker_mode`, `subscribe_shared_tracker`, `run_tracker_now`, `get_tracker_status`, `record_tracking_data` (for ingestion from external jobs if needed).
  - Minimal HTTPS endpoints (if needed) for webhook-style ingestion or notification callbacks, kept thin and auth-gated.
  - Scheduled Function to fan out due tracker runs; Task handler function to process a single tracker run.

## Tracker-AI behavior
- Dedicated agent surface per user space (separate from chat sessions) with its own conversation memory; seeded with user persona + tracker metadata.
- For computational trackers: store a minimal Python template (threshold checks, basic math only). On trigger, Python writes a structured result; `TrackerAiService` turns it into a 2-sentence footnote before notification.
- For AI trackers: fetch latest snapshot/change events, project into a compact summary, and let Tracker-AI decide `triggered` plus footnote. Irregular notifications send only when `triggered === true`; regular always notify but include “no change” notes.
- Composite tracking: when any dependency updates, consolidate all dependent snapshots into one AI prompt to evaluate cross-signal effects.

## Data and isolation
- Firestore layout (proposed):
  - `/trackers/{trackerId}` documents scoped by owner; `visibility` drives who can see/subscribes.
  - `/trackers/{trackerId}/subscriptions/{userId}` for shared pool membership and delivery prefs.
  - `/trackers/{trackerId}/runs/{runId}` with snapshot hash, change events, analysis result, and notification decisions.
  - `/trackerSpaces/{userId}/persona` and `/trackerSpaces/{userId}/history` for Tracker-AI context (separate from chat sessions).
- Access policy: Auth via `AuthService`; ACL enforced in app layer; shared trackers require explicit subscription; admins bypass only where justified.

## Execution flows
1) **Create tracker (via MCP)**: Main AI collects intent → calls `tracking.create_tracker` with target, mode, analysis type → app validates, stores tracker, seeds schedule, returns tracker id + next run ETA.
2) **Scheduled/queued run**: Scheduler enqueues `runTrackerOnce(trackerId)` → app fetches last snapshot → fetch new data → normalize + `computeChangeSet` → route to computational or AI analyzer → write `AnalysisResult` → enqueue notifications if needed.
3) **Notifications**: `dispatchNotifications` expands subscriptions, respects rate limits/quiet hours, calls notifier (initially MCP callback endpoint). Logs `NotificationRecord` and Tracker-AI footnote text.
4) **Shared tracker subscription**: User calls `subscribe_shared_tracker` → app adds subscription row and optional per-user delivery prefs; shared tracker runs once and emits to all subscribers.

## Safety and quality checks
- Timeouts on all HTTP fetches (10s default) and Python executions (30s hard limit). Retries only for idempotent GETs with capped backoff.
- Strict schema validation on inbound data (Zod) before normalization; reject malformed inputs.
- Logging: log tracker mutations, run outcomes, and notification sends via `LoggingService` with `logType` variants (`trackerRun`, `trackerNotification`).
- Rate limits: per-user tracker creation, per-tracker run frequency, and Python execution cap (reuse MCP rate limiting).
- Privacy: store only necessary fields; no raw PII in logs or prompts; redact secrets.

## Testing strategy (mapped to repo norms)
- Unit: core helpers (`shouldNotify`, change detection, subscription merge).
- Integration: app use-cases with fake adapters for store/scheduler/notifier; Python executor mocked to ensure templates are simple and bounded.
- Contract: MCP server tools schema tests; ensure auth/zod validation guards are enforced.
- E2E (later): scheduled run → analysis → notification happy-path with test Firestore project.

## Rollout slices
1) Session 1 (Foundation): core types/helpers, Firestore adapter, scheduler hooks, MCP surface for create/list/run-now/status, and end-to-end execution with stub analyzer/notifier plus tests.
2) Session 2 (Analysis/AI/Notifications): computational + AI analyzers, notifier and delivery prefs, shared trackers, composite handling, hardening (retries, rate limits, logging/exports), and expanded MCP tools with full test coverage.

---

# How It All Works (Implementation Guide)

This section documents the current implementation details for maintainability and future feature development.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User/Agent (MCP Client)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ Bearer Token + Tool Calls
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              MCP Layer (src/mcp/tracking.ts)                 │
│  - Authentication via AuthService                            │
│  - Tool routing (create_tracker, run_tracker_now, etc.)     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         App Layer (src/app/tracking/TrackingService.ts)      │
│  - Business logic orchestration                              │
│  - runTrackerOnce: fetch → normalize → analyze → notify     │
│  - runDueTrackers: scheduler loop                            │
└───┬───────────────┬───────────────┬─────────────────────┬───┘
    │               │               │                     │
    ▼               ▼               ▼                     ▼
┌──────┐    ┌──────────┐    ┌─────────┐         ┌──────────┐
│ Core │    │ Adapters │    │ Fetcher │         │ Logging  │
│Domain│    │(Firestore│    │(HTTP/PM)│         │ Service  │
└──────┘    └──────────┘    └─────────┘         └──────────┘
```

## Core Components

### 1. Domain Types (`src/core/tracking/types.ts`)

**Tracker Interface:**
```typescript
{
  id: TrackerId,           // UUID
  ownerId: UserId,         // User who created it
  visibility: 'personal' | 'shared',
  target: TrackerTarget,   // What to track (union type)
  mode: 'regular' | 'irregular',
  analysis: TrackerAnalysis, // How to analyze (union type)
  schedule: TrackerSchedule,
  notification: TrackerNotification,
  status: 'active' | 'paused' | 'error'
}
```

**Target Types (Union):**
- `polymarketMarket`: `{ type, marketId }`
- `polymarketEvent`: `{ type, eventId }`
- `httpSource`: `{ type, url }`
- `substackFeed`: `{ type, url }`
- `composite`: `{ type, dependencyTrackerIds[] }`

**Analysis Types (Union):**
- `computational`: `{ type, thresholdConfig, pythonTemplateId }`
- `ai`: `{ type, promptTemplateId, personaRefs?, inputProjectionRules? }`

### 2. TrackingService (`src/app/tracking/TrackingService.ts`)

**Constructor Dependencies:**
- `FirestoreTrackingStore`: Database operations
- `TrackingDataFetcher`: External data retrieval
- `LoggingService` (optional): Activity logging
- `OpenAIAdapter` (optional): AI analysis

**Key Methods:**

#### `createTracker(userId, target, mode, analysis)`
1. Generates UUID for tracker
2. Creates `Tracker` object with defaults
3. Saves to Firestore via store
4. Auto-subscribes owner
5. Logs creation event
6. Returns tracker object

#### `runTrackerOnce(trackerId)`
**Complete execution flow:**

```
1. Load tracker from Firestore
2. Get last snapshot (if exists)
3. Fetch fresh data via fetcher
4. Normalize data → NormalizedItem[]
5. Compute changes (computeChangeSet)
6. Create & save new snapshot
7. Route to analyzer:
   ├─ computational → runComputationalAnalysis()
   └─ ai → runAiAnalysis()
8. Get AnalysisResult
9. Determine if notification needed (shouldNotify)
10. If yes → dispatchNotifications()
11. Save TrackerRun record
12. Return TrackerRun
```

#### `runComputationalAnalysis(tracker, changes, items)`
1. Load Python template by `pythonTemplateId` from `templates.ts`
2. Inject data: `items` and `changes` as JSON
3. Execute via `PythonExecutionClient`
4. Parse JSON output from last line of stdout
5. Extract `{ triggered, summary, footnote }`
6. Return `AnalysisResult`

**Python Output Format:**
```python
import json
print(json.dumps({
    "triggered": True,
    "summary": "Volume exceeded threshold",
    "footnote": "Based on 24h volume"
}))
```

#### `runAiAnalysis(tracker, changes, items)`
1. Load prompt template by `promptTemplateId` from `templates.ts`
2. Replace placeholders: `{{TARGET}}`, `{{ITEMS}}`, `{{CHANGES}}`
3. Call `OpenAIAdapter.complete()` with system + user messages
4. Clean markdown code blocks from response
5. Parse JSON response
6. Return `AnalysisResult`

**Prompt Template Example:**
```
You are a Tracker AI. Analyze the following data changes.
Tracker Target: {{TARGET}}
Current Items: {{ITEMS}}
Changes: {{CHANGES}}
Return JSON: { "triggered": boolean, "summary": "...", "footnote": "..." }
```

#### `runDueTrackers()`
**Scheduler loop:**
1. Load all active trackers via `store.listAllActiveTrackers()`
2. For each tracker:
   - Check `isDue()` based on schedule
   - If due → call `runTrackerOnce()`
   - Catch and log errors (continue on failure)

#### `isDue(tracker)`
**Interval-based check:**
```
1. Parse schedule.value (seconds)
2. Get last run timestamp
3. If never run → return true
4. Calculate: lastRun + interval <= now
```

#### `dispatchNotifications(tracker, analysisResult)`
1. Load subscriptions for tracker
2. For each subscriber:
   - Create `NotificationRecord`
   - Save to Firestore
   - Log notification event
3. **Future**: Call webhook/email adapter

### 3. Data Fetcher (`src/adapters/tracking/TrackingDataFetcher.ts`)

**Supported Sources:**

```typescript
fetch(target: TrackerTarget): Promise<any[]>
```

- **Polymarket Market**: `GET https://clob.polymarket.com/markets/{id}`
- **Polymarket Event**: `GET https://gamma-api.polymarket.com/events/{id}`
- **HTTP Source**: Generic `GET` to specified URL
- **Substack Feed**: Not yet implemented
- **Composite**: Returns empty (doesn't fetch external data)

**Error Handling:**
- All fetch errors are caught and logged
- Returns empty array `[]` on failure
- No retries (fetcher is stateless)

### 4. Firestore Store (`src/adapters/tracking/FirestoreTrackingStore.ts`)

**Collections Structure:**

```
/trackers/{trackerId}
  - Tracker document
  /subscriptions/{userId}
    - Subscription documents
  /runs/{runId}
    - TrackerRun documents
  /snapshots/{timestamp}
    - Snapshot documents

/tracker_notifications/{notificationId}
  - NotificationRecord documents
```

**Key Methods:**
- `createTracker(tracker)` / `getTracker(id)` / `updateTracker(tracker)`
- `listTrackers(userId)`: Queries by `ownerId`
- `listAllActiveTrackers()`: Queries `status == 'active'`
- `addSubscription(sub)` / `listSubscriptions(trackerId)`
- `saveSnapshot(snapshot)` / `getLastSnapshot(trackerId)`
- `saveRun(run)` / `getLastRun(trackerId)`
- `saveNotificationRecord(record)`

**Indexing Requirements:**
- Index on `trackers.ownerId` (for user queries)
- Index on `trackers.status` (for scheduler)
- Subcollection indexes auto-created by Firestore

### 5. MCP Server (`src/mcp/tracking.ts`)

**Exposed Tools:**

| Tool Name | Arguments | Returns | Purpose |
|-----------|-----------|---------|---------|
| `create_tracker` | `token, target, mode, analysis` | `{ trackerId, status }` | Create new tracker |
| `list_trackers` | `token` | `{ trackers[] }` | List user's trackers |
| `run_tracker_now` | `token, trackerId` | `{ runId, status, changes }` | Manual run |
| `get_tracker_status` | `token, trackerId` | `{ status, lastRun }` | Check status |
| `update_tracker_mode` | `token, trackerId, mode` | `{ status, mode }` | Change mode |
| `subscribe_shared_tracker` | `token, trackerId` | `{ status }` | Subscribe to shared |

**Authentication Flow:**
1. Extract `token` from args
2. Call `authService.authenticate(token)`
3. Extract `userId` from claims
4. Verify ownership/access
5. Call `trackingService` method
6. Return result or throw error

### 6. Templates (`src/core/tracking/templates.ts`)

**Python Templates:**
- `basic_threshold`: Detects if changes occurred
- `price_movement`: Placeholder for price analysis

**AI Prompt Templates:**
- `default_persona`: Generic analysis prompt
- `crypto_trader`: Crypto-focused analysis

**Adding New Templates:**
1. Add template string to `PYTHON_TEMPLATES` or `PROMPT_TEMPLATES`
2. Use placeholders for computational templates (data injected via code)
3. Use `{{PLACEHOLDER}}` syntax for AI templates
4. Update tracker creation to reference new template IDs

## Data Flow Examples

### Example 1: Creating a Tracker

```
User → Agent: "Track the US Election market"
Agent → MCP: create_tracker({
  target: { type: 'polymarketMarket', marketId: 'abc123' },
  mode: 'regular',
  analysis: { type: 'ai', promptTemplateId: 'default_persona' }
})
MCP → Auth: Verify token
Auth → TrackingService: createTracker(userId, target, mode, analysis)
TrackingService → Store: Save tracker + subscription
Store → Firestore: Write documents
TrackingService → Logging: Log creation
TrackingService → MCP: Return tracker
MCP → Agent: { trackerId: 'xyz', status: 'created' }
Agent → User: "I've set up a tracker for the US Election market."
```

### Example 2: Running a Tracker

```
Scheduler (every 5 min) → TrackingService.runDueTrackers()
TrackingService → Store: listAllActiveTrackers()
For each due tracker:
  TrackingService → Fetcher: fetch(target)
  Fetcher → Polymarket API: GET /markets/abc123
  Fetcher → TrackingService: Return market data
  TrackingService → Domain: normalizePolymarketMarket()
  TrackingService → Domain: computeChangeSet(lastSnapshot, newItems)
  TrackingService → OpenAIAdapter: complete(prompt with changes)
  OpenAIAdapter → OpenAI: API call
  OpenAIAdapter → TrackingService: JSON response
  TrackingService → Domain: shouldNotify(mode, triggered)
  If notify:
    TrackingService → Store: saveNotificationRecord()
    TrackingService → Logging: Log notification
  TrackingService → Store: saveRun()
```

### Example 3: AI Analysis Flow

```
Input:
  tracker.target = { type: 'polymarketMarket', marketId: '123' }
  items = [{ id: '123', data: { volume: 5000, price: 0.55 } }]
  changes = [{ type: 'modified', itemId: '123', diff: { volume: +500 } }]

Template:
  "Analyze changes for {{TARGET}}. Items: {{ITEMS}}. Changes: {{CHANGES}}"

After replacement:
  "Analyze changes for {\"type\":\"polymarketMarket\",\"marketId\":\"123\"}.
   Items: [{\"id\":\"123\",\"data\":{\"volume\":5000,\"price\":0.55}}].
   Changes: [{\"type\":\"modified\",\"itemId\":\"123\",\"diff\":{\"volume\":500}}]"

OpenAI Response:
  ```json
  {
    "triggered": true,
    "summary": "Volume increased by 500, now at 5000",
    "footnote": "Market activity trending upward"
  }
  ```

Output → AnalysisResult:
  {
    trackerId: '...',
    type: 'ai',
    triggered: true,
    summary: "Volume increased by 500, now at 5000",
    footnote: "Market activity trending upward"
  }
```

## Change Detection

**Algorithm (`computeChangeSet` in `src/core/tracking/domain.ts`):**

```typescript
function computeChangeSet(
  lastSnapshot: Snapshot | null,
  newItems: NormalizedItem[]
): ChangeEvent[]

Logic:
1. If no lastSnapshot → all items are "added"
2. Create maps: oldMap (by fingerprint), newMap (by fingerprint)
3. For each old item not in newMap → "removed"
4. For each new item:
   - If not in oldMap → "added"
   - If in oldMap with different fingerprint → "modified" (with diff)
5. Return ChangeEvent[]
```

**Fingerprinting:**
- Each `NormalizedItem` has a `fingerprint` field
- Computed via `computeSnapshotFingerprint()` (SHA256 of JSON data)
- Used for deterministic change detection

**Notification Decision (`shouldNotify`):**
```typescript
function shouldNotify(
  tracker: Tracker,
  changes: ChangeEvent[],
  analysisTriggered: boolean
): boolean

Logic:
- If mode === 'regular' → always true (notify on schedule)
- If mode === 'irregular' → only if analysisTriggered === true
```

## Extending the System

### Adding a New Target Type

1. **Update types** (`src/core/tracking/types.ts`):
   ```typescript
   export type TrackerTarget =
     | { type: 'polymarketMarket'; marketId: string }
     | { type: 'newSource'; sourceId: string } // NEW
   ```

2. **Add fetcher** (`src/adapters/tracking/TrackingDataFetcher.ts`):
   ```typescript
   private async fetchNewSource(sourceId: string): Promise<any[]> {
     const response = await this.httpClient.get(`https://api.example.com/data/${sourceId}`);
     return [response];
   }
   ```

3. **Add normalizer** (`src/core/tracking/domain.ts`):
   ```typescript
   export function normalizeNewSource(raw: any): NormalizedItem {
     return {
       id: raw.id,
       timestamp: Date.now(),
       data: { ...raw },
       fingerprint: computeItemFingerprint(raw)
     };
   }
   ```

4. **Update service** (`src/app/tracking/TrackingService.ts`):
   ```typescript
   const newItems = rawData.map(d => 
     tracker.target.type === 'newSource' 
       ? normalizeNewSource(d)
       : normalizePolymarketMarket(d)
   );
   ```

### Adding a New Analysis Type

1. **Update types**:
   ```typescript
   export type TrackerAnalysis =
     | { type: 'computational'; pythonTemplateId: string }
     | { type: 'ai'; promptTemplateId: string }
     | { type: 'hybrid'; computationalId: string; aiId: string } // NEW
   ```

2. **Add analyzer method** in `TrackingService`:
   ```typescript
   private async runHybridAnalysis(...): Promise<AnalysisResult> {
     const compResult = await this.runComputationalAnalysis(...);
     const aiResult = await this.runAiAnalysis(...);
     return { ...aiResult, triggered: compResult.triggered || aiResult.triggered };
   }
   ```

3. **Update routing** in `runTrackerOnce`:
   ```typescript
   if (tracker.analysis.type === 'hybrid') {
     analysisResult = await this.runHybridAnalysis(...);
   }
   ```

### Adding a New Notification Channel

1. **Create adapter** (`src/adapters/tracking/EmailNotifier.ts`):
   ```typescript
   export class EmailNotifier {
     async send(userId: UserId, subject: string, body: string): Promise<void> {
       // SendGrid/SES integration
     }
   }
   ```

2. **Update `dispatchNotifications`**:
   ```typescript
   if (tracker.notification.channels.includes('email')) {
     await this.emailNotifier.send(sub.userId, analysis.summary, ...);
   }
   ```

3. **Update Tracker schema**:
   ```typescript
   notification: {
     channels: ('mcp_callback' | 'email' | 'push')[],
     ...
   }
   ```

## Deployment & Operations

### Environment Variables
- `PYTHON_EXECUTION_URL`: Python execution endpoint (default: Firebase function)
- `OPENAI_API_KEY`: OpenAI API key (secret)

### Firestore Security Rules
```javascript
match /trackers/{trackerId} {
  allow read: if request.auth.uid == resource.data.ownerId
    || exists(/databases/$(database)/documents/trackers/$(trackerId)/subscriptions/$(request.auth.uid));
  allow create: if request.auth != null;
  allow update: if request.auth.uid == resource.data.ownerId;
}
```

### Cloud Scheduler Setup (TODO)
```bash
gcloud scheduler jobs create http run-trackers \
  --schedule="*/5 * * * *" \
  --uri="https://us-central1-PROJECT.cloudfunctions.net/runDueTrackers" \
  --http-method=POST \
  --oidc-service-account-email=SERVICE_ACCOUNT
```

### Monitoring
- All tracker operations logged via `LoggingService`
- Log types: `agentAction` with actions like:
  - `tracker_created`
  - `notification_sent`
- Queryable in Firestore (`logs` collection) and BigQuery

## Known Limitations & Future Work

**Current Limitations:**
- No webhook/email notifications (only MCP callback stubs)
- Cron schedules not yet supported (only intervals)
- Composite trackers not fully implemented
- No backpressure/rate limiting on scheduler
- Substack/RSS feeds not implemented

**Planned Enhancements:**
- Cloud Scheduler integration for `runDueTrackers`
- Webhook adapter for external notifications
- More sophisticated AI personas with memory
- Cross-tracker analytics and insights
- User-facing dashboard for tracker management
- Shared tracker marketplace
