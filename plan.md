# Polymarket MCP Read – Frontend & Agent Guide

Audience:  
- Frontend dev wiring the UI to the Firebase-hosted MCP server (`polymarket-read`).  
- AI agent that will call MCP tools in response to user requests.

Keep scopes minimal, respect rate limits, and never ship secrets to the browser.

---

## 1. Environment and endpoints

- Firebase project: `audit-3a7ec`, region `us-central1`.
- Production HTTPS functions:
  - `POST https://us-central1-audit-3a7ec.cloudfunctions.net/issueMcpToken`
  - `GET|POST https://us-central1-audit-3a7ec.cloudfunctions.net/polymarketReadMcp`
- Local emulator (when running `firebase emulators:start` from this repo):
  - `http://127.0.0.1:5001/audit-3a7ec/us-central1/<functionName>`

Treat `baseUrl` as the Functions origin (prod vs emulator), and reuse it everywhere.

---

## 2. Auth and MCP token flow (frontend)

### 2.1 Get Firebase ID token

Use the standard Firebase Web SDK:

```ts
import { getAuth, getIdToken } from "firebase/auth";

async function getFirebaseIdToken(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("User must be signed in");
  // Force refresh so backend sees latest claims
  return getIdToken(user, true);
}
```

### 2.2 Exchange for MCP bearer

```ts
export interface McpClaims {
  userId: string;
  role: "user" | "admin";
  tier: "free" | "paid";
  scopes: string[];
  issuedAt: number;
  expiresAt: number;
}

export interface McpTokenResponse {
  token: string;
  claims: McpClaims;
}

export async function getMcpToken(baseUrl: string): Promise<McpTokenResponse> {
  const idToken = await getFirebaseIdToken();

  const resp = await fetch(`${baseUrl}/issueMcpToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      // Request only what you need; defaults to public scopes if omitted.
      scopes: ["polymarket:read:public", "polymarket:read:user", "polymarket:read:stream"],
    }),
  });

  if (!resp.ok) {
    throw new Error(`issueMcpToken failed: ${resp.status}`);
  }

  return resp.json();
}
```

- Claims include `{ userId, role, tier, scopes, issuedAt, expiresAt }`.
- Default TTL is 1 hour (`AUTH_TOKEN_TTL_SECONDS`). Refresh before expiry; keep tokens in memory, not `localStorage`.
- Admin role only if Firebase UID is in `ADMIN_USER_IDS`; scopes are always filtered to what the role is allowed to use.

---

## 3. Calling the MCP server

### 3.1 Discovery

```ts
export interface McpToolDescription {
  name: string;
  description: string;
}

export async function discoverPolymarketTools(baseUrl: string) {
  const resp = await fetch(`${baseUrl}/polymarketReadMcp`, { method: "GET" });
  if (!resp.ok) throw new Error(`Discovery failed: ${resp.status}`);
  const body = await resp.json();
  // { server: "polymarket-read", tools: McpToolDescription[] }
  return body;
}
```

### 3.2 Invoking a tool

All tool calls follow the same shape:

```ts
export async function callPolymarketTool<TInput, TResult>(
  baseUrl: string,
  tool: string,
  input: TInput
): Promise<TResult> {
  const resp = await fetch(`${baseUrl}/polymarketReadMcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, input }),
  });

  const body = await resp.json();

  if (!resp.ok) {
    // Typical errors: 400 validation, 401 auth, 403 scope/rate-limit, 5xx upstream.
    throw new Error(`MCP error (${resp.status}): ${JSON.stringify(body)}`);
  }

  return body.result as TResult;
}
```

### 3.3 Rate limits and streaming

- Non-admin rate limits per minute:
  - public tools: `30`
  - user-data tools: `10`
  - streaming tools: `5`
- Limit errors surface as `AccessDeniedError` with HTTP `403`.
- Streaming tools return a bounded object:
  - `{ events: [...], durationMs }`
  - You must pass `maxEvents` and/or `durationSeconds` to avoid large responses.

---

## 4. Tool catalog (frontend usage)

All tools require a `token` (the MCP bearer) inside `input`.
`issueMcpToken` filters scopes to `polymarket:read:public|user|stream` and, by default, also includes `markets:read` and `analysis:read` for composites.

### 4.1 Discovery / metadata (scope: `polymarket:read:public`)

Use when you want to search/browse Polymarket content.

- `search-entities`
  - Natural language: “Search markets/events/profiles for X”
  - Input:
    - `token: string`
    - `query: string`
    - `types?: ("markets" | "events" | "profiles")[]`
    - `limit?: number`

- `list-markets`
  - Natural language: “List markets matching filters (category/search/tag)”
  - Input:
    - `token`
    - `limit?, offset?, active?, closed?, category?, search?, tagId?, sortBy?, ascending?`

- `list-active-markets-by-volume`
  - Natural language: “Show top active markets by total traded volume”
  - Input:
    - `token`
    - `limit?, offset?, category?, search?, tagId?`

- `get-market`
  - Natural language: “Get full details for market M”
  - Input:
    - `token`
    - `marketIdOrSlug: string`

- `list-events`, `get-event`
  - Natural language: “List events” / “Get details for event E”

- `list-tags`, `get-tag`, `get-related-tags`, `get-market-tags`
  - Natural language: “Browse tags”, “Show tags for this market”, “Find related tags”

- `list-series`, `get-series`, `list-teams`, `get-sports-metadata`
  - Natural language: “Show sports series/teams/metadata for navigation”

- `list-comments`, `get-comment`
  - Natural language: “Fetch comments for market/event/user”

### 4.2 Market metrics (scope: `polymarket:read:public`)

Use when you need volume/interest numbers.

- `get-live-volume`
  - Natural language: “How much volume has this event traded (live)?”
  - Input:
    - `token`
    - `eventId: number`

- `get-open-interest`
  - Natural language: “How much money is currently at stake in these markets?”
  - Input:
    - `token`
    - `marketIds: string[]`

- `get-market-volume`
  - Natural language: “What’s the total traded volume for this market?”
  - Input:
    - `token`
    - `marketIdOrSlug: string`

- `get-top-holders`, `get-aggregated-builder-leaderboard`, `get-daily-builder-volume`
  - Natural language: “Who holds the most?”, “How are builders performing?”

### 4.3 Pricing / orderbooks (scope: `polymarket:read:public`)

Use when the UI needs live prices or orderbook snapshots.

- `get-price-history`
  - Natural language: “Show a price chart for this token over time”
  - Input:
    - `token`
    - `tokenId: string`
    - `interval?: "1m" | "1h" | "6h" | "1d" | "1w" | "max"`
    - `startTs?, endTs?, fidelityMinutes?`

- `get-orderbook`, `get-books`
  - Natural language: “Show orderbook (bids/asks) for token(s)”

- `get-price`, `get-prices`
  - Natural language: “What is the best bid/ask for this outcome?”

- `get-midpoint`, `get-spreads`
  - Natural language: “What’s the midpoint price/spread for these tokens?”

### 4.4 Composites / helpers

These tools encapsulate common workflows and are the primary entrypoints for the AI agent.

- `get-btc-price` (scope: `markets:read`)
  - Natural language: “What is the current BTC price in USD/EUR/…?”
  - Input:
    - `token`
    - `quoteSymbol?: string` (e.g. `"USD"`, `"EUR"`; defaults to `USD`)
  - Output:
    - `{ baseSymbol, quoteSymbol, price, asOf, source, refreshHintSeconds }`

- `get-market-pricing` (scope: `polymarket:read:public`)
  - Natural language: “Show me current pricing for this specific outcome”
  - Input:
    - `token`
    - `selection: { marketId: string; outcomeIndex?: number; outcomeName?: string }`

- `compare-weekly-movement` (scope: `analysis:read`)
  - Natural language: “Compare which of these two outcomes moved more over the last week”
  - Input:
    - `token`
    - `left: { marketId: string; outcomeIndex?: number; outcomeName?: string }`
    - `right: { marketId: string; outcomeIndex?: number; outcomeName?: string }`
  - Output includes:
    - `{ left, right, dominant: "left" | "right" | "tie", rationale, leftMarket, rightMarket, leftOutcome, rightOutcome }`

- `get-user-space` (scope: `polymarket:read:public`)
  - Natural language: “Load this user’s private agent workspace”
  - Input:
    - `token`
  - Output:
    - `{ customInstructions: string[]; chats: string[]; usedTools: string[]; customSystems: string[] }`

- `get-admin-space` (scope: `admin:read`)
  - Natural language: “Load the shared admin pool of feeds/systems”
  - Input:
    - `token`
  - Output:
    - `{ sharedFeeds: string[]; sharedSystems: string[] }`

### 4.5 User data (scope: `polymarket:read:user`)

Always pass `user` equal to the Firebase UID that obtained the MCP token, unless the caller is an admin.

- `get-user-positions`
- `get-user-trades`
- `get-user-activity`
- `get-total-value-of-positions`

### 4.6 Streaming (scope: `polymarket:read:stream`)

- `stream-crypto-prices`
  - Natural language: “Stream crypto price updates for a short window”
  - Input:
    - `token`
    - `maxEvents?: number (<=100)`
    - `durationSeconds?: number (<=60)`

- `stream-comments`
  - Natural language: “Stream new comments for a market/event/user”

- `stream-market-channel`
  - Natural language: “Stream market-channel (orderbook/price change) events for these token IDs”

### 4.7 Health (scope: `polymarket:read:public`)

- `health`
  - Natural language: “Check whether Gamma and Data API are healthy”

---

## 5. Frontend wiring patterns

- Maintain one MCP token per signed-in user session; refresh before `claims.expiresAt`.
- Use the `GET polymarketReadMcp` discovery response to:
  - Drive tool pickers, autocomplete, or debug UIs.
  - Detect new tools without changing the frontend code.
- For user tools, always pass `user` equal to the Firebase UID used in `issueMcpToken` (admins may override).
- Respect:
  - `refreshHintSeconds` (from `get-btc-price`) to throttle price refresh.
  - Per-minute rate limits: debounce searches, batch price lookups, and avoid tight loops.
- On `401`/`403`:
  - Try refreshing the MCP token (re-run `issueMcpToken`).
  - If that fails, prompt the user to re-authenticate with Firebase.
- Log errors server-side; never log raw tokens or other secrets.

---

## 6. AI agent prompt (canonical behavior)

This section is the *system prompt* for the AI agent that will call the `polymarket-read` MCP server.

### 6.1 Agent identity and goals

- You are a read-only Polymarket assistant.
- You can only **read** market data: no trading, no swaps, no bridge, no mutation.
- Your job is to:
  - Understand the user’s question.
  - Select the minimal set of tools needed.
  - Call tools correctly.
  - Summarize results clearly in natural language.

### 6.2 General rules

- Prefer **composite** tools when they fit the question:
  - Use `get-market-pricing` for “what is the price of X?” (single outcome).
  - Use `compare-weekly-movement` for “which of these moved more?” between two selections.
  - Use `get-btc-price` for BTC spot quotes.
- Use **discovery** tools when you need to *find* markets/events:
  - `search-entities`, `list-markets`, `list-events`, `list-tags`, etc.
- Use **metrics** tools for volume/interest:
  - `get-live-volume`, `get-market-volume`, `get-open-interest`, `get-top-holders`.
- Use **user** tools only for the caller’s own data (unless admin):
  - `get-user-positions`, `get-user-trades`, `get-user-activity`, `get-total-value-of-positions`.
- Use **streaming** tools only for short-lived streams and only when explicitly asked for “live updates” or similar.
- Do **not** make speculative statements about balances or trades—fetch them with tools whenever needed.

### 6.3 Mapping natural language → tools

Examples of how you should think:

- “What are the most popular markets right now?”
  - Use `list-active-markets-by-volume`.

- “Show me details and current odds for [market name or slug].”
  - If you have an ID/slug: call `get-market`.
  - To zoom into a specific outcome: call `get-market-pricing` with `marketId` + `outcomeName`.

- “Which side moved more over the last week: [selection A] or [selection B]?”
  - Use `compare-weekly-movement` with `left` and `right` selections.

- “What’s the total money in this event/market?”
  - For an event: use `get-live-volume` on the event ID.
  - For a specific market: use `get-market-volume` and, optionally, `get-open-interest`.

- “What does my Polymarket portfolio look like?”
  - Use `get-user-positions` and `get-total-value-of-positions` with `user` equal to the caller’s UID.

- “What trades have I made recently?”
  - Use `get-user-trades`.

- “Stream live price changes or orderbook updates.”
  - Use `stream-crypto-prices` (for generic crypto) or `stream-market-channel` (for specific Polymarket tokens).
  - Always set `maxEvents` and/or `durationSeconds`.

### 6.4 When to combine tools

- To answer richer questions, you may chain multiple tools:
  - Example: “What is the highest-volume sports event today, and what are its top markets?”
    1. Use `list-events` with filters for category/time and `sortBy` volume if available, or combine `list-events` + `get-live-volume`.
    2. For the top event’s ID, use `list-markets` with filters or `search-entities` scoped by title.
  - Example: “What is my exposure to this market, and what is its current price?”
    1. Use `get-user-positions` filtered by market.
    2. Use `get-market-pricing` (or `get-price`) for the outcome(s) the user holds.

- After calling tools, always:
  - Summarize key numbers (prices, volume, open interest).
  - Explain what they mean in plain language.

### 6.5 Access and safety

- Respect scopes and isolation:
  - Do not attempt to call user tools for another user unless the claims allow admin access.
  - If you receive an `AccessDeniedError`, explain that the data is restricted.
- Do not invent trades or balances; if user data tools fail, state that you cannot access their portfolio.
- Never attempt trading, bridging, or order placement: those surfaces are not exposed.
