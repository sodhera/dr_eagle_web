# Google News RSS MCP Plan

Design for a standalone Google News RSS MCP server and its integration into the tracking system. All feeds are English-only, support UAE/other country ranking plus global, and only text fields are extracted. Polling cadence: every 3 hours per query unless explicitly overridden.

## Scope and objectives
- Deliver an MCP server dedicated to Google News RSS search feeds (no web scraping, no alerts API).
- Support regionalized feeds (`gl`, `ceid`) while keeping `hl=en-US` for English UI/content.
- Provide a structured query builder covering supported operators; avoid freeform URLs.
- Minimize resource use: de-duplicate identical feeds across users, reuse fetch results per polling round, and only enqueue notifications when `computeChangeSet` detects new items.
- Keep output textual: title, link, description/snippet text, source, and published time. Ignore media, images, and tracking params beyond the canonical link.

## How it fits TrackerPlan
- New target type in `core/tracking`: `googleNewsRssSearch` with `{ querySpec, edition }`.
- `TrackingDataFetcher` gains a `googleNewsRss` branch that delegates to a dedicated adapter; normalized output is `NormalizedItem` with fingerprints derived from `{link, title, publishedAt, source, queryKey}`.
- Shared feed cache: multiple trackers/users referencing the same `queryKey` pull from one cached fetch per run to avoid duplicate HTTP calls and duplicate change events.
- `runTrackerOnce` remains unchanged: fetch → normalize → `computeChangeSet` → analyzer → `shouldNotify`.
- Scheduler: include Google News RSS trackers in the 3-hour cadence. Irregular trackers only notify when analysis triggers; regular trackers notify every poll with “no change” footers if needed.

## Query model (structured, not free text)
Store and build queries from structured parts to keep the MCP tools deterministic and easy to validate:
```json
{
  "all": ["nigeria", "bank"],
  "any": ["central", "treasury"],
  "none": ["football", "soccer"],
  "exact": ["\"central bank\""],
  "sites": ["reuters.com", "ft.com"],
  "time": "24h",            // "24h" | "48h" | "7d" | null or { "after": "YYYY/MM/DD", "before": "YYYY/MM/DD" }
  "wildcards": ["nigeria * election"],
  "edition": "AE:en"        // maps to gl/ceid below; hl is fixed to en-US
}
```
Builder rules:
- Join `all` terms with spaces (implicit AND).
- Wrap `exact` entries in quotes as-is.
- Prefix `none` with `-`.
- `any` joins with `OR` inside parentheses.
- `sites` become `(site:reuters.com OR site:ft.com)`; omit if empty.
- `wildcards` pass through verbatim (e.g., `nigeria * election`).
- `time` supports `when:24h`, `when:48h`, `when:7d`, or `after:/before:` pairs.
- Encode the final `q` and append `hl=en-US&gl=<gl>&ceid=<ceid>`.

### Supported operators (use only these)
- Default AND via space separation.
- `OR` / `|` for alternation and parentheses for grouping.
- Exact phrase: `"quoted phrase"`.
- Exclude: `-term`.
- Wildcard: `*` inside phrases (e.g., `"nigeria * election"`).
- Domain filter: `site:example.com` (combine with OR for multiple).
- Time filters: `when:24h`, `when:48h`, `when:7d`, `after:YYYY/MM/DD`, `before:YYYY/MM/DD`.
- Not supported (reject): `filetype:`, `intitle:`, `source:`, `location:`, numeric range operators, or non-English `hl`.

### Editions / region mapping (English)
- Global/US: `gl=US`, `ceid=US:en`, `hl=en-US`.
- UAE: `gl=AE`, `ceid=AE:en`, `hl=en-US`.
- UK: `gl=GB`, `ceid=GB:en`, `hl=en-US`.
- India: `gl=IN`, `ceid=IN:en`, `hl=en-US`.
- Singapore: `gl=SG`, `ceid=SG:en`, `hl=en-US`.
- Australia: `gl=AU`, `ceid=AU:en`, `hl=en-US`.
- Default to `US:en` if edition unspecified; reject non-`:en` editions to enforce English output.

## MCP server design (`mcp/google-news-rss.ts`)
- Purpose: Build, validate, and fetch Google News RSS search feeds using structured inputs; expose stable tools for Tracker-AI and other agents.
- Auth: same bearer token flow as other MCP servers; enforce scope for read-only operations.
- Tools (typed with Zod):
  - `list_editions`: returns supported `{ code, gl, ceid, description }`.
  - `build_search_feed`: input is `querySpec`; returns canonical feed URL and the rendered `q` string for logging.
  - `preview_search_feed`: input is `querySpec`; fetches once and returns top N normalized items (text-only) plus `queryKey` fingerprint.
  - `fetch_search_feed`: input `{ queryKey }`; uses cache if available from the last poll, otherwise fetches; returns normalized items and `fetchedAt`.
  - `explain_operators`: returns the operator cheat-sheet above (no network).
- Server behavior:
  - Enforce 10s HTTP timeout and 2 attempts max with capped backoff (idempotent GET).
  - Use a shared HTTP client with custom UA `tracking-agents-google-news/0.1`.
  - Parse XML to objects; strip HTML tags in descriptions; normalize whitespace.
  - Map Google News item fields to `{ id, title, link, description, publishedAt, source }`.
  - `queryKey` is a stable hash of `{ renderedQ, gl, ceid }` and is returned with every call.

## Tracking integration plan
- Target shape: `{ type: 'googleNewsRssSearch', queryKey, querySpec, edition }`.
- Normalization (core helper):
  - `id`: SHA256 of `link` (fallback to guid/title if missing).
  - `title`: ASCII-cleaned text.
  - `content`: concatenated title + description text; strip HTML.
  - `source`: `source` tag text or domain of `link`.
  - `publishedAt`: parsed RFC822 date → ISO string.
  - `queryKey`: copied through for de-dupe across shared queries.
  - `fingerprint`: SHA256 of `{id, content, publishedAt}`.
- Caching/de-dup:
  - Per `queryKey`, store last `fingerprint` set + `fetchedAt`.
  - Poll each `queryKey` once per 3-hour window; feed results fan out to all trackers subscribed to that `queryKey`.
  - Downstream `computeChangeSet` runs per tracker using cached results; subscribers only see deltas relative to their last snapshot.
- Scheduling:
  - Add Google News RSS trackers to the existing tracking scheduler queue; default interval 3h (configurable but enforce lower bound 1h).
  - Respect irregular mode: notify only when `analysis.triggered === true`.
  - Add jitter (±5m) to avoid thundering herd on Google.
- Resource guardrails:
  - Max feeds per run: cap (e.g., 200 feeds) with spillover to next window.
  - If `429` or `503`, back off the affected `queryKey` to next window and record telemetry.
  - Never fetch the same `queryKey` more than once per window even if multiple trackers request it.

## Data handling and safety
- Only return text fields; strip HTML tags and tracking params from links where possible.
- Do not log full feed bodies; log `queryKey`, status, and counts only.
- Respect robots.txt semantics; fetch frequency limited to 3h per query with jitter.
- No secrets required; keep auth disabled for Google News RSS (public endpoints).
- Validate and reject queries containing non-ASCII or disallowed operators to avoid unstable feeds.

## Testing strategy
- Unit: query builder (string rendering and encoding), operator validation, edition mapping, and fingerprint generation.
- Integration: XML parsing against recorded fixtures (including malformed/empty feeds), timeout/retry paths, and cache reuse behavior.
- Contract: MCP tool schema tests and deterministic `queryKey` generation across runs.
- End-to-end (tracking): fixture-based run that simulates two trackers sharing the same `queryKey` to verify single fetch, change detection, and notification fan-out.

## Rollout steps (code work tracked elsewhere)
1) Implement query builder + operator validator in `core/tracking/googleNewsRss.ts`.
2) Add `GoogleNewsRssClient` adapter with timeout/backoff, parser, and cache store (Firestore or in-memory with persistence per run).
3) Extend `TrackingDataFetcher` + `NormalizedItem` mappers for `googleNewsRssSearch`.
4) Create MCP server `google-news-rss` with the tools above and hook to shared HTTP client.
5) Wire scheduler to include RSS trackers; ensure fan-out per `queryKey` for multi-user reuse.
6) Add tests (unit/integration/contract/E2E fixture) and update deployment docs once live.
