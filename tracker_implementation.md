Based on my research, here's a comprehensive breakdown of how the tracker and AI analysis system works in your backend:

Overview
The tracker system is a powerful monitoring engine that:

Watches external data sources (Polymarket markets, Google News RSS, HTTP endpoints, etc.)
Detects changes in that data over time
Analyzes those changes using either Python code or AI
Notifies users when something important happens
Core Architecture
1. Tracker Types & Modes
Target Types (what you can track):

polymarketMarket - Individual Polymarket markets
polymarketEvent - Polymarket events
googleNewsRssSearch - Google News RSS feeds with advanced query building
httpSource - Generic HTTP endpoints
substackFeed - RSS feeds (planned)
composite - Combines multiple trackers
Modes (when to notify):

regular: Notifies on every scheduled run, regardless of changes
irregular: Only notifies when the analysis determines something is "triggered" (important)
2. The Execution Pipeline
When a tracker runs, it follows this flow:

1. FETCH DATA → 2. NORMALIZE → 3. DETECT CHANGES → 4. ANALYZE → 5. NOTIFY
Let me break down each step:

Step 1: Fetch Data (
TrackingDataFetcher
)
Calls external APIs to get fresh data
For Google News RSS, it uses a shared cache (RssFeedCache) to avoid duplicate fetches
Multiple users tracking the same query share one fetch per 3-hour window
This is identified by a queryKey (hash of the query)
For Polymarket, it hits their CLOB/Gamma APIs
Returns raw data as JSON
Step 2: Normalize (
domain.ts
)
Converts raw data into a standardized 
NormalizedItem
 format:
typescript
{
  id: string,           // Unique identifier
  timestamp: number,    // When this data was observed
  data: {...},         // The actual payload
  fingerprint: string   // SHA256 hash for change detection
}
Different normalizers for different sources:
normalizePolymarketMarket()
 - extracts question, prices, volume, liquidity
normalizeGoogleNewsRss()
 - extracts title, link, description, source, pubDate
Step 3: Detect Changes (
computeChangeSet
)
Compares the new snapshot with the last saved snapshot
Identifies changes as:
added - New items that weren't in the last snapshot
removed - Items that disappeared
modified - Items whose fingerprint changed
Returns a list of 
ChangeEvent
 objects
Step 4: Analysis - This is where Python and AI come in!
There are two analysis types:

A) Computational Analysis (Python-based)
How it works:

The tracker specifies a pythonTemplateId (e.g., 'basic_threshold' or 'price_movement')
The system loads the template from PYTHON_TEMPLATES in 
templates.ts
It injects the data: items (current state) and changes (what changed)
Sends the code to a Firebase Cloud Function (execute-python-code) via 
pythonExecution.ts
The Python code runs in a sandboxed environment with:
30-second timeout
512MB memory limit
Whitelisted imports only (no network/file access)
Python outputs JSON: { "triggered": bool, "summary": string, "footnote": string }
The system parses this output to decide what to do
Example Python Template:

python
# basic_threshold template
items = [...]  # injected data
changes = [...] # injected changes

triggered = False
summary = "No significant changes."

if len(changes) > 0:
    triggered = True
    summary = f"Detected {len(changes)} changes."

print(json.dumps({
    "triggered": triggered,
    "summary": summary,
    "footnote": "Basic Threshold Analysis"
}))
Use cases:

Threshold checks (e.g., "notify if price changes by >5%")
Statistical analysis
Custom logic the user defines
B) AI Analysis (OpenAI-based)
How it works:

The tracker specifies a promptTemplateId (e.g., 'default_persona' or 'crypto_trader')
The system loads the template from PROMPT_TEMPLATES in 
templates.ts
It replaces placeholders:
{{TARGET}} → tracker target info
{{ITEMS}} → current items
{{CHANGES}} → change events
Sends the prompt to OpenAI (gpt-5-mini or similar) via OpenAIAdapter
The AI responds with JSON: { "triggered": bool, "summary": string, "footnote": string }
The system parses this to decide what to do
Example Prompt Template:

You are a Tracker AI. Analyze the following data changes for a tracker.
Tracker Target: {{TARGET}}
Current Items: {{ITEMS}}
Changes: {{CHANGES}}

Determine if this is noteworthy based on the user's persona.
Return a JSON object: { "triggered": boolean, "summary": "string", "footnote": "string" }
Use cases:

Subjective analysis (e.g., "is this news article relevant to my interests?")
Natural language summaries
Context-aware notifications (persona-driven)
Step 5: Notification Decision (
shouldNotify
)
The system decides whether to notify based on:

Regular mode: Always notifies (every run)
Irregular mode: Only notifies if analysis.triggered === true
If notifying:

Looks up all subscribers to this tracker
Creates a 
NotificationRecord
 for each
Stores records in Firestore (tracker_notifications collection)
Logs the notification event
3. Regular vs Irregular Explained
Regular Trackers
Run on a schedule (e.g., every 3 hours)
Always send notifications, even if nothing changed
Great for: periodic updates, digest emails, scheduled reports
Example: "Give me a daily summary of this market, even if nothing happened"
Irregular Trackers
Run on a schedule (same as regular)
Only send notifications when analysis says "triggered"
Great for: alerts, important events only, reducing noise
Example: "Only notify me if the price moves by >10%"
Key insight: Both modes run on the same schedule and do the same analysis. The difference is when they notify.

4. Python Specifics
Where the code runs:

A separate Firebase Cloud Function: execute-python-code
URL: https://us-central1-sodhera-search.cloudfunctions.net/execute-python-code
Security:

Sandboxed execution (no file I/O, no network)
Whitelisted imports only
30-second timeout
512MB memory limit
Data flow:

TrackingService → pythonExecution.ts → HTTP POST → Cloud Function → Python sandbox → JSON output
Templates:

Stored in 
src/core/tracking/templates.ts
Users can select which template to use via pythonTemplateId
Custom templates can be added to the PYTHON_TEMPLATES object
5. Data Storage (Firestore Structure)
/trackers/{trackerId}
  - Fields: id, ownerId, target, mode, analysis, schedule, status, etc.
  
  /subscriptions/{userId}
    - Fields: trackerId, userId, role, deliveryPrefs, createdAt
  
  /runs/{runId}
    - Fields: id, trackerId, timestamp, snapshotId, changeEvents, analysisResult, status
  
  /snapshots/{timestamp}
    - Fields: trackerId, timestamp, items[], fingerprint

/tracker_notifications/{notificationId}
  - Fields: id, trackerId, runId, userId, timestamp, channel, reason, status

/rss_feed_cache/{queryKey}
  - Fields: queryKey, items[], fetchedAt
Caching for Google News RSS:

Multiple trackers with the same queryKey share one cached fetch
Cache is valid for 3 hours
Reduces API load and speeds up execution
6. MCP Server Integration
The tracking system exposes MCP tools (in 

src/mcp/tracking.ts):
create_tracker - Create a new tracker
list_trackers - Get all trackers for a user
run_tracker_now - Manually trigger a tracker run
get_tracker_status - Check tracker status
update_tracker_mode - Switch between regular/irregular
subscribe_shared_tracker - Subscribe to another user's tracker
These tools are available to AI agents (like your main agent) to manage trackers on behalf of users.

7. Scheduling
Currently partially implemented. The plan is:

A Firebase Cloud Scheduler or Pub/Sub function runs periodically (e.g., every 5 minutes)
Calls TrackingService.runDueTrackers()
For each active tracker, checks if it's due (based on schedule.type and schedule.value)
Runs the tracker if due
Interval calculation:

typescript
lastRun.timestamp + intervalSeconds * 1000 <= now
Default interval: 1 hour (3600 seconds)

Summary
The tracker system is a sophisticated monitoring engine that:

Polls external data sources on a schedule
Normalizes and fingerprints the data
Detects changes by comparing snapshots
Analyzes changes using either Python code (computational) or AI (LLM-based)
Notifies users based on mode (regular = always, irregular = when triggered)
Uses Firestore for storage and Firebase Cloud Functions for Python execution
Optimizes Google News RSS with shared caching
Regular vs Irregular:

Regular: "Tell me every 3 hours, even if nothing changed"
Irregular: "Only tell me when something important happens"
Python vs AI:

Python: Deterministic, rule-based, fast, user-defined logic
AI: Subjective, context-aware, persona-driven, natural language
Let me know if you need clarification on any specific part!