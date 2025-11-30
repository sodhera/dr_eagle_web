# Integrations

Current integrations: Reddit API documentation scrape. Use this doc to register each integration with endpoints, auth, rate limits, and error shapes. Keep the HTTP client configuration centralized in `src/adapters/http/httpClient.ts` (default 10s timeout, JSON parsing, typed errors).

## When adding an integration
- Describe endpoints (HTTP method + path) and expected request headers/query params.
- Document auth (API keys/OAuth), rotation, and where config lives (env keys).
- Capture rate limits and safe retry/backoff policy (only for idempotent calls).
- Note response shapes and error payload schema; add Zod parsers in `app/` or dedicated adapter modules.
- Include any robots.txt/scraping constraints if applicable.

## Template
- **Service:** 
- **Endpoints:** 
- **Auth:** 
- **Rate limits/backoff:** 
- **Error shapes/handling:** 
- **Owner:** 



## Reddit API documentation scrape
- **Service:** Reddit developer documentation (API and OAuth reference) scraped for offline reference.
- **Endpoints:** `GET https://www.reddit.com/dev/api` and `GET https://www.reddit.com/dev/api/oauth`, extracting text from `div.contents`.
- **Auth:** Public docs; no auth.
- **Rate limits/backoff:** 20s timeout per request, custom scraper UA `tracking-agents-scraper/0.3`, and a 1s pause between requests; keep to the two documented pages and respect robots/terms.
- **Error shapes/handling:** Network/HTTP failures raise runtime errors; scrape fails fast if `div.contents` is missing. Output is normalized to ASCII text for stability.
- **Output/location:** Run `python3 Reddit_dev_docs/scrape_reddit_dev_docs.py` to refresh `Reddit_dev_docs/api.txt` and `Reddit_dev_docs/api-oauth.txt`.
- **Owner:** Backend

## OpenAI API
- **Service:** OpenAI API for LLM chat completions.
- **Endpoints:** `POST https://api.openai.com/v1/chat/completions`
- **Auth:** Bearer token via `OPENAI_API_KEY` env var.
- **Rate limits/backoff:** Standard OpenAI tier limits. Using `openai` npm SDK which handles some retries.
- **Error shapes/handling:** SDK throws typed errors.
- **Owner:** Backend (Agent Layer)

## Google News RSS (search feeds)
- **Service:** Google News RSS search (public, English-only feeds).
- **Endpoints:** `GET https://news.google.com/rss/search?q=<query>&hl=en-US&gl=<country>&ceid=<country>:en`
- **Auth:** None (public).
- **Rate limits/backoff:** 10s timeout, 2 attempts max with capped backoff on idempotent GET. Default polling every 3 hours per distinct `queryKey` with jitter; cap total feeds per run and defer on `429`/`503`.
- **Error shapes/handling:** Treat non-2xx as typed errors; return parsed/normalized items only on success. Reject unsupported operators or non-`:en` editions in the builder before issuing HTTP requests.
- **Output/location:** Text-only fields (title, link, description/snippet, source, pubDate) parsed from RSS XML; normalization/fingerprints defined in `googlenewsrssplan.md`.
- **Owner:** Backend (Tracking/MCP)

---

## OpenAI gpt-5-nano Web Search

**Endpoint**: OpenAI Responses API (`POST /v1/responses`)
**Purpose**: General-purpose web search for current information

**Auth**: API key in `OPENAI_API_KEY` environment variable

**Request format**:
```json
{
  "model": "gpt-5-nano",
  "tools": [{ "type": "web_search" }],
  "input": "search query string"
}
```

**Rate limits**: 
- Tier 1 (free): ~3 RPM
- Tier 2-5 (paid): 60+ RPM depending on tier
- Backoff strategy: Exponential backoff with jitter, max 2 retries

**Error handling**:
- 429 (rate limit) → retry with backoff
- 5xx (server error) → retry once
- 4xx (client error) → no retry, return typed error
- Timeout → no retry, return TIMEOUT error

**Response parsing**:
- Response is an array of steps: `[web_search_call, message]`
- Extract text from `message.content[0].text`
- Extract citations from `message.content[0].annotations` (type: `url_citation`)
- Normalize into structured `SearchResponse` format
