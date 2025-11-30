# MCP Tools API Reference

Complete reference for all available MCP (Model Context Protocol) tools in the DREAGLE backend.

## System Prompt

The agent (`gpt-4.1-nano`) is initialized with the following system prompt:

```text
You are a helpful AI assistant for the DREAGLE platform.
You have access to real-time market data and tools.
Always use the provided tools to answer questions about markets, prices, or user data.
Do not hallucinate market data.
```

## Authentication

All MCP tools require authentication via bearer token.

**Get a token:**
```bash
POST https://us-central1-audit-3a7ec.cloudfunctions.net/issueMcpToken
Content-Type: application/json

{
  "idToken": "<firebase-id-token>",
  "scopes": ["polymarket:read:public"]
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "claims": {
    "userId": "user123",
    "role": "user",
    "tier": "free",
    "scopes": ["polymarket:read:public", "markets:read", "analysis:read"],
    "issuedAt": 1732780800,
    "expiresAt": 1732784400
  }
}
```

**Use in MCP calls:**
All tool calls require the `token` parameter with this bearer token.

---

## Available Tools

1. [search-entities](#search-entities) - Search Polymarket markets, events, and profiles
2. [list-markets](#list-markets) - List markets with filtering and sorting
3. [list-events](#list-events) - List events with filtering and sorting
4. [get-market](#get-market) - Get full details for a specific market
5. [get-event](#get-event) - Get full details for a specific event
6. [get-price](#get-price) - Get current market price (alias for get-market)
7. [get-open-interest](#get-open-interest) - Get open interest for a market
8. [find-trending](#find-trending) - Find trending markets (24h volume)
9. [find-closing-soon](#find-closing-soon) - Find markets closing soon
10. [find-longshots](#find-longshots) - Find low probability markets
11. [find-volatile](#find-volatile) - Find volatile markets
12. [get-user-activity](#get-user-activity) - Get user activity log
13. [get-btc-price](#get-btc-price) - Get Bitcoin spot price
14. [execute-python-code](#execute-python-code) - Execute Python code in sandbox

---

## Tool Details

### search-entities

Search for markets, events, and profiles on Polymarket. Uses the `/public-search` endpoint for comprehensive results.

**Parameters:**
```typescript
{
  token: string;      // Required - Bearer token
  query: string;      // Required - Search query
  limit?: number;     // Optional - Max results (default 20)
}
```

### list-markets

List markets with advanced filtering and sorting.

**Parameters:**
```typescript
{
  token: string;
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
  order?: string;     // e.g. "volume24hr", "liquidity", "createdAt", "endDate"
  ascending?: boolean;// Default TRUE. Set FALSE for "largest" or "top" results.
}
```

### list-events

List events with advanced filtering and sorting.

**Parameters:**
```typescript
{
  token: string;
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
  tag_slug?: string;
  order?: string;     // e.g. "volume", "startDate", "endDate"
  ascending?: boolean;// Default TRUE. Set FALSE for "largest" or "top" results.
}
```

### get-market

Get full details for a specific market by ID or Slug.

**Parameters:**
```typescript
{
  token: string;
  id: string;         // Market ID or Slug
}
```

### get-event

Get full details for a specific event by ID or Slug.

**Parameters:**
```typescript
{
  token: string;
  id: string;         // Event ID or Slug
}
```

### get-price

Get current price for a market. Alias for `get-market`.

**Parameters:**
```typescript
{
  token: string;
  marketId: string;
}
```

### get-open-interest

Get open interest, volume, and liquidity stats for a market.

**Parameters:**
```typescript
{
  token: string;
  marketId: string;
}
```

### find-trending

Find trending markets based on 24h volume.

**Parameters:**
```typescript
{
  token: string;
  limit?: number;
}
```

### find-closing-soon

Find active markets that are closing within a specified number of hours.

**Parameters:**
```typescript
{
  token: string;
  hours?: number;     // Default 24
  limit?: number;
}
```

### find-longshots

Find active markets with low probability outcomes (max price threshold).

**Parameters:**
```typescript
{
  token: string;
  max_price?: number; // Default 0.10
  limit?: number;
}
```

### find-volatile

Find markets with high price volatility in the last 24h.

**Parameters:**
```typescript
{
  token: string;
  limit?: number;
}
```

### get-user-activity

Get activity log for a user.

**Parameters:**
```typescript
{
  token: string;
  user?: string;      // User address (defaults to authenticated user)
  limit?: number;
}
```

### get-btc-price

Get current Bitcoin spot price.

**Parameters:**
```typescript
{
  token: string;
  quoteSymbol?: string; // Default "USD"
}
```

### execute-python-code

Execute arbitrary Python code in a secure, sandboxed environment.

**Parameters:**
```typescript
{
  token: string;
  code: string;
  input_data?: object;
}
```

---

## Error Handling

Common errors returned by tools:

- `AuthError`: Invalid token
- `AccessDeniedError`: Permission denied
- `RateLimitError`: Too many requests
- `ValidationError`: Invalid parameters

## Rate Limits

| Tool | Free Tier | Paid Tier | Admin |
|------|-----------|-----------|-------|
| search-entities | 10/min | 10/min | Unlimited |
| execute-python-code | 10/hour | 10/hour | Unlimited |
| Other tools | Unlimited | Unlimited | Unlimited |
