# MCP servers

Current MCP server: `polymarket-read` (contains all read-only Polymarket + BTC price + composite helper tools). Keep surfaces small, typed, and documented.

## Structure
- Place server definitions in `mcp/` with one entrypoint per server (e.g., `mcp/<name>.ts`).
- Define explicit tool schemas/contracts; prefer multiple small, composable tools over a single catch-all.
- Keep server code free of business logic—delegate to `app/` use-cases and `core/` helpers.

## Required doc entries for each server
- **Name & purpose:** what the server does for the model.
- **Tools:** list of tools and their input/output schemas.
- **Auth:** tokens/OAuth assumptions and where config lives.
- **Latency/failure modes:** expected response times, retry/backoff guidance, and error mapping.
- **Limits:** rate limits or quotas relevant to the tools.



## Server: `polymarket`

- **Name & Purpose**: `polymarket` - Provides read-only access to Polymarket data (markets, events, order books, user positions) for LLMs.
- **Tools**:
  - `search_markets`: Search markets by query string.
  - `list_markets`: List markets with pagination and filters.
  - `get_market`: Get full market details by ID or Slug.
  - `list_events`: List events/groups.
  - `get_event`: Get event details.
  - `get_order_books`: Get CLOB order books.
  - `get_prices`: Get best bid/ask prices.
  - `get_price_history`: Get historical prices.
  - `get_user_positions`: Get user positions.
  - `get_user_activity`: Get user activity log.
  - `get_top_holders`: Get top holders for a token.
  - `list_comments`: List market comments.
  - `get_builder_leaderboard`: Get builder leaderboard.
  - `execute-python-code`: **[NEW]** Execute arbitrary Python code in sandboxed environment.
- **Auth**: Bearer token (issued via `issueMcpToken`).
- **Latency/Failure Modes**: Dependent on Polymarket API. Enforce timeouts. 429s should be handled with retries where appropriate.

---

## Tool: `execute-python-code`

Execute custom Python code in a secure, sandboxed Cloud Function environment.

### Parameters
```json
{
  "code": "string (required) - Python code to execute",
  "input_data": "object (optional) - Dictionary available as globals in code"
}
```

### Returns
```json
{
  "success": "boolean - Whether execution succeeded",
  "output": "string - Captured stdout from execution",
  "error": "string | null - Error message if execution failed",
  "execution_time_ms": "number - Execution duration in milliseconds"
}
```

### Example
```json
{
  "code": "import json\ndata = {'values': [1, 2, 3, 4, 5]}\nresult = sum(data['values'])\nprint(f'Sum: {result}')\nprint(json.dumps({'total': result}))",
  "input_data": {}
}
```

**Response:**
```json
{
  "success": true,
  "output": "Sum: 15\n{\"total\": 15}\n",
  "error": null,
  "execution_time_ms": 45
}
```

### Security & Limitations

**Allowed modules (whitelist only):**
- `json`, `math`, `datetime`, `statistics`, `itertools`, `functools`
- `collections`, `re`, `string`, `random`

**Blocked:**
- File system access (`os`, `open`, `file`, `pathlib`)
- Network access (`socket`, `urllib`, `requests`, `http`)
- Process control (`subprocess`, `sys`, `multiprocessing`)
- Dynamic code execution (`eval`, `exec`, `compile`, `importlib`)

**Limits:**
- Timeout: 30 seconds (hard limit, enforced by Cloud Function)
- Memory: 512MB
- Rate limit: 10 executions per hour per user
- No persistent state between executions

### Use Cases

**Data Analysis:**
```python
import statistics
data = [1.5, 2.3, 3.1, 2.9, 4.2, 3.8]
print(f"Mean: {statistics.mean(data)}")
print(f"Median: {statistics.median(data)}")
print(f"StdDev: {statistics.stdev(data)}")
```

**JSON Processing:**
```python
import json
raw = '{"markets": [{"price": 0.65, "volume": 1000}]}'
data = json.loads(raw)
filtered = [m for m in data['markets'] if m['price'] > 0.5]
print(json.dumps(filtered, indent=2))
```

**Date Calculations:**
```python
from datetime import datetime, timedelta
now = datetime.now()
future = now + timedelta(days=30)
print(f"30 days from now: {future.strftime('%Y-%m-%d')}")
```

### Deployment Status
- **Status**: Code created, pending Cloud Function deployment
- **See**: `python-functions/README.md` for deployment instructions
- **Note**: Currently returns placeholder error until function is deployed

---

## Server: `google-news-rss` (planned)

- **Name & Purpose**: `google-news-rss` – Standalone MCP server to build, validate, and fetch English Google News RSS search feeds (global + regional editions such as UAE) for trackers.
- **Tools (planned)**:
  - `list_editions`: Enumerate supported `gl/ceid` pairs (English-only).
  - `build_search_feed`: Structured query → canonical `q` string and feed URL.
  - `preview_search_feed`: One-off fetch returning top N normalized items.
  - `fetch_search_feed`: Cached fetch by `queryKey` for scheduled runs.
  - `explain_operators`: Returns supported operator cheat-sheet (no network).
- **Auth**: Bearer token, same issue/validate flow as other MCP servers; read-only surface.
- **Latency/Failure Modes**: Public HTTP GET with 10s timeout and 2-attempt capped backoff; 429/503 should defer the feed to next window. No retries on non-idempotent paths.
- **Limits**: Poll each `queryKey` at most once per 3-hour window; text-only extraction; reject unsupported operators/editions. See `googlenewsrssplan.md` for full design and rollout steps.

---

## Server: `web-search`

- **Name & Purpose**: `web-search` – General-purpose web search using OpenAI's gpt-5-nano model with built-in web_search capability. Used by the main agent for queries requiring current web information not available in Polymarket or RSS feeds.
- **Tools**:
  - `search_web`: Execute a web search and return structured results
    - `query` (string, required): Search query (3-400 chars)
    - `maxResults` (number, optional): Max results to return (1-8, default 5)
    - `freshnessHours` (number, optional): Prefer results from last N hours
    - `region` (string, optional): ISO country code (e.g., "US")
    - `includeAnswers` (boolean, optional): Include comprehensive answer (default true)
  - `get_search_capabilities`: Return search configuration and limits (no network call)
- **Auth**: Bearer token (issued via `issueMcpToken`), same as other MCP servers.
- **Latency/Failure Modes**: 
  - Typical response time: 2-8 seconds
  - Timeout: 15 seconds (hard limit)
  - Rate limits: 20 calls/10 minutes per user
  - Retries: Automatic retry with exponential backoff for 429/5xx errors
- **Response Format**: Returns narrative text with inline citations (title, URL, snippet) rather than raw search results.

