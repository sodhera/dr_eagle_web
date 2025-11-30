# Search MCP Plan

**Plan for implementing general-purpose web search using OpenAI's gpt-5-nano model.**

---

## Overview

Implement a standalone MCP server that performs general-purpose web search using OpenAI's `gpt-5-nano` model with the built-in `web_search` tool type. The main agent will use this when it needs to perform searches unrelated to Polymarket or existing RSS search capabilities.

### Example API Usage
```javascript
import OpenAI from "openai";
const client = new OpenAI();

const response = await client.responses.create({
    model: "gpt-5-nano",
    tools: [{ type: "web_search" }],
    input: "What was a positive news story from today?",
});

console.log(response.output_text);
```

### Actual API Response Format

Based on real gpt-5-nano responses, the API returns an array of completion steps:

```json
[
    {
        "type": "web_search_call",
        "id": "ws_67c9fa0502748190b7dd390736892e100be649c1a5ff9609",
        "status": "completed"
    },
    {
        "id": "msg_67c9fa077e288190af08fdffda2e34f20be649c1a5ff9609",
        "type": "message",
        "status": "completed",
        "role": "assistant",
        "content": [
            {
                "type": "output_text",
                "text": "On March 6, 2025, several news...",
                "annotations": [
                    {
                        "type": "url_citation",
                        "start_index": 2606,
                        "end_index": 2758,
                        "url": "https://...",
                        "title": "Title..."
                    }
                ]
            }
        ]
    }
]
```

**Key observations:**
- Response is an array with a `web_search_call` step followed by an assistant `message` step
- The actual text response is in `content[0].text` (type: "output_text")
- Citations are in `content[0].annotations` array with:
  - `type`: "url_citation"
  - `start_index`, `end_index`: Position in text where citation applies
  - `url`: Source URL
  - `title`: Page title
- No direct access to snippets, published dates, or result ranking (must extract from text)

---

## Scope and Objectives

- Deliver a minimal, typed MCP server (`web-search`) that returns structured search results plus a concise answer
- Use OpenAI Responses API (`POST /v1/responses`) with `model: "gpt-5-nano"` and `tools: [{ type: "web_search" }]`
- Keep results text-only: title, url, snippet, and observed time; no images or tracking parameters
- Respect privacy: avoid logging full queries or raw snippets; prefer hashed queries + counts
- **Do NOT use for Polymarket data or Google News RSS feeds** (those already have dedicated MCP servers)

---

## Architecture Placement

Following the existing layered architecture:

### **Core Layer** (`src/core/search/`)
Pure domain logic, no I/O:
- **types.ts**: Domain types (`SearchQuery`, `SearchResult`, `SearchResponse`)
- **schemas.ts**: Zod parsers to validate/normalize model output
- **validation.ts**: Query validation, sanitization, and guardrails (reject Polymarket/RSS queries)

### **Adapters Layer** (`src/adapters/openai/`)
- **webSearchClient.ts**: Wraps OpenAI Responses API
  - Enforce timeout: 15s with AbortSignal
  - Set `temperature: 0` for consistent results
  - Capped retries: 2 attempts on 429/5xx with jitter; no retries on 4xx/validation errors
  - Map provider errors to typed errors

### **App Layer** (`src/app/search/`)
- **runWebSearch.ts**: Orchestrates the search flow
  - Validate input (reject Polymarket/RSS use cases)
  - Apply rate limits (per-user fixed window: 20 calls/10 minutes)
  - Call adapter
  - Map provider output to domain types
  - Telemetry: log hashed query, latency, provider status, result count

### **MCP Layer** (`src/mcp/`)
- **web-search.ts**: MCP server exposing web search tool
  - Enforce auth (same bearer token flow as other MCP servers)
  - Delegate to `runWebSearch` use-case

---

## Tool Contract

### Tool: `search_web`

**Input Schema:**
```typescript
{
  query: string;              // Required, trimmed, 3-400 chars
  maxResults?: number;        // Optional, 1-8, default 5
  freshnessHours?: number;    // Optional, 1-168, prefer recent results
  region?: string;            // Optional, ISO country code (e.g., "US", "AE")
  includeAnswers?: boolean;   // Optional, default true, include summary answer
}
```

**Output Schema:**
```typescript
{
  text: string;               // Full response text from gpt-5-nano (includes summary and inline citations)
  citations: Citation[];      // Array of URL citations extracted from annotations
  provider: "gpt-5-nano-web-search";
  respondedAt: string;        // ISO timestamp
  usage?: {                   // Optional token usage info
    promptTokens: number;
    responseTokens: number;
  };
}
```

**Citation Schema:**
```typescript
{
  url: string;                // Source URL (tracking params stripped)
  title: string;              // Page title from annotation
  textSnippet: string;        // Portion of response text that references this citation
  startIndex: number;         // Start position in text (from annotation)
  endIndex: number;           // End position in text (from annotation)
  rank: number;               // Citation position (1-indexed)
}
```

**Rejection Cases:**
- Reject inputs that look like Polymarket/market-data queries
- Reject Google News RSS-type queries
- Return typed error instructing agent to use specialized MCP instead

---

## Execution Flow

1. **Validate Input**
   - Validate against Zod schema
   - Enforce length/character set constraints
   - Strip tracking params (`utm_*`, `ref`, etc.) from URLs returned by model

2. **Build System Prompt**
   ```typescript
   const systemPrompt = `
   You are a web search assistant. Use the web_search tool to find relevant information.
   Return at most ${maxResults} results.
   Include publication time if available.
   Respond with a brief summary (max 800 chars) and structured search results.
   Format: JSON with fields: summary, results (array of {title, url, snippet, observedAt, source, rank})
   `;
   ```

3. **Call OpenAI Responses API**
   ```javascript
   const response = await client.responses.create({
     model: "gpt-5-nano",
     tools: [{ type: "web_search" }],
     input: renderedPrompt,
     max_output_tokens: ~600,
     temperature: 0,
     // AbortSignal with 15s timeout
   });
   ```

4. **Parse Response**
   - Parse `response.output_text` (or tool output fields) through Zod
   - On parse failure, throw `SearchProviderParseError` with provider context
   - If model omits tool calls and returns plain text, reject with parse error

5. **Rate Limiting**
   - Per-user fixed window: 20 calls/10 minutes (enforced in `runWebSearch`)
   - Global circuit-breaker if OpenAI returns sustained 5xx errors

6. **Telemetry**
   - Log: hashed query, latency, provider status, result count
   - Never log: raw snippets, full URLs, user query text (only hash)

---

## Error Handling

### Typed Errors

Map provider failures to domain errors:

- **SearchAuthError** (401/403): Authentication failed
- **SearchRateLimitError** (429): Rate limit exceeded
- **SearchProviderError** (5xx): Provider/network error
- **SearchValidationError**: Invalid input
- **SearchProviderParseError**: Schema mismatch or unexpected response format

### Retry Policy

- **Retry cases** (max 2 attempts with jittered backoff):
  - 429 (rate limit)
  - 500, 502, 503 (server errors)
  
- **No retry cases**:
  - 4xx (client errors except 429)
  - Validation errors
  - Parse errors
  - Timeout errors

### Error Messages

- Treat non-2xx as errors
- If model omits tool calls and returns plain text, reject rather than trusting freeform text
- Include provider context in error messages for debugging

---

## Implementation Details

### Core Types (`src/core/search/types.ts`)

```typescript
export interface SearchQuery {
  query: string;
  maxResults?: number;
  freshnessHours?: number;
  region?: string;
  includeAnswers?: boolean;
}

export interface Citation {
  url: string;
  title: string;
  textSnippet: string;
  startIndex: number;
  endIndex: number;
  rank: number;
}

export interface SearchResponse {
  text: string;
  citations: Citation[];
  provider: "gpt-5-nano-web-search";
  respondedAt: string;
  usage?: {
    promptTokens: number;
    responseTokens: number;
  };
}

export class SearchError extends Error {
  constructor(
    message: string,
    public code: 'AUTH' | 'RATE_LIMIT' | 'PROVIDER' | 'VALIDATION' | 'PARSE',
    public details?: any
  ) {
    super(message);
    this.name = 'SearchError';
  }
}
```

### Validation Guardrails (`src/core/search/validation.ts`)

```typescript
const POLYMARKET_KEYWORDS = [
  'market', 'polymarket', 'prediction', 'event',
  'liquidity', 'volume', 'position', 'bet', 'odds'
];

const RSS_KEYWORDS = [
  'rss', 'feed', 'google news', 'news feed', 'subscribe'
];

/**
 * Reject queries that should use specialized MCP servers
 */
export function validateSearchQuery(query: SearchQuery): void {
  const lowerQuery = query.query.toLowerCase();
  
  // Check for Polymarket queries
  if (POLYMARKET_KEYWORDS.some(kw => lowerQuery.includes(kw))) {
    throw new SearchError(
      'Use polymarket MCP server for market-related queries',
      'VALIDATION',
      { rejectedKeywords: POLYMARKET_KEYWORDS }
    );
  }
  
  // Check for RSS queries
  if (RSS_KEYWORDS.some(kw => lowerQuery.includes(kw))) {
    throw new SearchError(
      'Use google-news-rss MCP server for RSS feed queries',
      'VALIDATION',
      { rejectedKeywords: RSS_KEYWORDS }
    );
  }
  
  // Length validation
  const trimmed = query.query.trim();
  if (trimmed.length < 3 || trimmed.length > 400) {
    throw new SearchError(
      'Query must be 3-400 characters',
      'VALIDATION'
    );
  }
  
  // Other validations...
}
```

### Adapter (`src/adapters/openai/webSearchClient.ts`)

```typescript
import OpenAI from 'openai';
import { SearchQuery, SearchResponse, SearchError } from '../../core/search/types';

export class WebSearchClient {
  private client: OpenAI;
  private timeout = 15000; // 15s

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async search(query: SearchQuery): Promise<SearchResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.client.responses.create({
        model: "gpt-5-nano",
        tools: [{ type: "web_search" }],
        input: this.buildPrompt(query),
        max_output_tokens: 600,
        temperature: 0,
        // signal: controller.signal, // Add when SDK supports it
      });

      clearTimeout(timeoutId);
      return this.parseResponse(response, query);
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw this.mapError(error);
    }
  }

  private buildPrompt(query: SearchQuery): string {
    let prompt = query.query;
    
    if (query.freshnessHours) {
      prompt += ` (prefer results from last ${query.freshnessHours} hours)`;
    }
    
    return prompt;
  }

  private parseResponse(response: any, query: SearchQuery): SearchResponse {
    // Response is an array: [web_search_call, message]
    // Find the message step
    const messageStep = Array.isArray(response) 
      ? response.find((step: any) => step.type === 'message')
      : response;
    
    if (!messageStep || !messageStep.content?.[0]) {
      throw new SearchError('Invalid response format', 'PARSE');
    }

    const outputContent = messageStep.content[0];
    const text = outputContent.text || '';
    const annotations = outputContent.annotations || [];

    // Extract citations from url_citation annotations
    const citations = annotations
      .filter((a: any) => a.type === 'url_citation')
      .map((a: any, index: number) => ({
        url: this.stripTrackingParams(a.url),
        title: a.title || '',
        textSnippet: text.substring(a.start_index, a.end_index),
        startIndex: a.start_index,
        endIndex: a.end_index,
        rank: index + 1,
      }));

    return {
      text,
      citations,
      provider: "gpt-5-nano-web-search",
      respondedAt: new Date().toISOString(),
      usage: response.usage,
    };
  }

  private stripTrackingParams(url: string): string {
    try {
      const urlObj = new URL(url);
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid'];
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString();
    } catch {
      return url; // Return original if parsing fails
    }
  }

  private mapError(error: any): SearchError {
    if (error.status === 401 || error.status === 403) {
      return new SearchError('Authentication failed', 'AUTH', error);
    }
    if (error.status === 429) {
      return new SearchError('Rate limit exceeded', 'RATE_LIMIT', error);
    }
    if (error.status >= 500) {
      return new SearchError('Provider error', 'PROVIDER', error);
    }
    return new SearchError('Search failed', 'PROVIDER', error);
  }
}
```

### MCP Server (`src/mcp/web-search.ts`)

```typescript
import { McpServer } from './server';
import { WebSearchClient } from '../adapters/openai/webSearchClient';
import { runWebSearch } from '../app/search/runWebSearch';
import { AuthService } from '../app/auth/authService';
import { SearchQuery } from '../core/search/types';

export function createWebSearchServer(
  authService: AuthService,
  openaiApiKey: string
): McpServer {
  const searchClient = new WebSearchClient(openaiApiKey);

  return {
    tools: {
      search_web: async (args: any) => {
        const { token, query, maxResults, freshnessHours, region, includeAnswers } = args;

        // Authenticate
        authService.authenticate(token);

        // Build query
        const searchQuery: SearchQuery = {
          query,
          maxResults: maxResults || 5,
          freshnessHours,
          region,
          includeAnswers: includeAnswers !== false,
        };

        // Execute search
        const response = await runWebSearch(searchClient, searchQuery);

        return response;
      },
    },
  };
}
```

---

## Testing Strategy

### Unit Tests

1. **Schema Validation** (`src/core/search/validation.test.ts`):
   - Query length validation (too short, too long, valid)
   - Polymarket keyword rejection
   - RSS keyword rejection
   - URL scrubbing (remove tracking params)

2. **Prompt Builder** (`src/adapters/openai/webSearchClient.test.ts`):
   - Deterministic prompt generation
   - Freshness parameter inclusion
   - Region parameter handling

3. **Error Mapping**:
   - 401/403 → SearchAuthError
   - 429 → SearchRateLimitError
   - 5xx → SearchProviderError
   - Parse failures → SearchProviderParseError

### Integration Tests

1. **Mock OpenAI Responses**:
   - Fixtures for successful tool output
   - Fixtures for plain text output (should reject)
   - Fixtures for 429/5xx responses
   - Verify timeout + retry behavior

2. **Domain Type Mapping**:
   - Parse response.output_text correctly
   - Extract structured results
   - Handle missing fields gracefully

### Contract Tests (MCP)

1. **Auth Enforcement**:
   - Valid token → success
   - Invalid token → auth error
   - Missing token → auth error

2. **Input Validation**:
   - Valid queries pass through
   - Polymarket queries rejected
   - RSS queries rejected
   - Invalid parameters rejected

3. **Output Schema**:
   - Response matches SearchResponse type
   - All required fields present
   - No live web calls in CI

### Load/Smoke Tests (Optional)

- Short-lived smoke test with recorded fixture
- Ensure server wiring works end-to-end
- No live web calls in automated tests

---

## Rollout Steps

### Phase 1: Core Implementation
1. [ ] Add core types/schemas under `src/core/search/`
2. [ ] Implement validation with Polymarket/RSS guardrails
3. [ ] Implement `WebSearchClient` adapter with OpenAI Responses
4. [ ] Add timeout and retry policy to adapter
5. [ ] Implement `runWebSearch` use-case with rate limiting

### Phase 2: MCP Server
6. [ ] Create MCP server `src/mcp/web-search.ts`
7. [ ] Add `search_web` tool with auth gate
8. [ ] Register server in entrypoints (`http-server.ts`)
9. [ ] Wire up to internal tool registry (if applicable)

### Phase 3: Testing
10. [ ] Write unit tests (validation, prompt building, error mapping)
11. [ ] Write integration tests with fixtures
12. [ ] Write MCP contract tests
13. [ ] Create manual test script

### Phase 4: Documentation
14. [ ] Document server in `docs/mcp-servers.md`
15. [ ] Document integration in `docs/integrations.md`
16. [ ] Update `docs/architecture.md` to mention search components
17. [ ] Update `AGENTS.md` to require reading this plan before search changes

### Phase 5: Deployment
18. [x] Test with real gpt-5-nano API to verify response format ✅ **CONFIRMED**
19. [ ] Deploy to Firebase
20. [ ] Verify cloud function works
21. [ ] Test end-to-end with main agent
22. [ ] Monitor costs and rate limits

---

## Open Questions

1. **~~gpt-5-nano Response Format~~** ✅ **RESOLVED**:
   - Response format confirmed (see "Actual API Response Format" section above)
   - Response is an array with `web_search_call` step and `message` step
   - Citations are in `annotations` array with `url_citation` type
   - Implementation updated in `parseResponse()` to extract text and citations

2. **Rate Limiting**:
   - Proposed: 20 calls/10 minutes per user
   - Should we also implement global rate limit?
   - Should we use Firestore counters or in-memory cache?

3. **Result Caching**:
   - Should we cache results to reduce API calls?
   - Suggested: 5-minute TTL with Firestore
   - Trade-off: stale results vs. cost savings

4. **Cost Monitoring**:
   - gpt-5-nano pricing is unknown (new model)
   - Should we implement cost tracking/alerts?
   - Log all searches to Firestore for cost analysis?

---

## Risk Assessment

**Low Risk**:
- Authentication (reuses existing pattern)
- MCP server structure (follows existing pattern)
- Validation logic (straightforward)

**Medium Risk**:
- gpt-5-nano response parsing (unknown API format)
- Rate limiting (depends on OpenAI limits)
- Cost implications (new model, unknown pricing)

**High Risk**:
- **gpt-5-nano availability** (new model, may not be GA yet)
- **API stability** (new tool type, may have breaking changes)

**Mitigation**:
- Test with real API immediately to verify availability
- Implement comprehensive error handling
- Start with conservative rate limits
- Monitor costs closely in production
- Keep adapter isolated for easy swapping if API changes

---

## Success Criteria

✅ **Functional**:
- Main agent can invoke `search_web` tool successfully
- Search results are accurate and properly formatted
- Authentication works correctly
- Polymarket/RSS queries are rejected with clear errors
- Error handling covers all failure modes

✅ **Non-Functional**:
- Response time < 15 seconds for typical queries
- Unit test coverage > 80%
- All documentation complete and accurate
- Follows existing architecture patterns
- Code passes TypeScript strict mode checks

✅ **User Experience**:
- Agent knows when to use web search vs. specialized tools
- Search results provide value to user queries
- Errors are graceful and informative
- No unexpected costs or rate limit violations

---

## Future Enhancements

**Post-MVP**:
- Implement result caching with Firestore (5-min TTL)
- Add per-user rate limiting (20/10min)
- Implement cost tracking and alerts
- Add search history for users
- Support filtering by date range

**Advanced**:
- Specialized search types (news, academic, images)
- Multi-query search with aggregation
- Follow-up searches with context
- Search analytics dashboard
- A/B testing for parameters
