# DrEagle Chat Integration Guide

This guide documents the integration of the Polymarket MCP server with the DrEagle chat application using GPT-5.1.

## Overview

The integration connects your Next.js chat application to Firebase-hosted MCP (Model Context Protocol) servers that provide read-only access to Polymarket data. The GPT-5.1 model uses function calling to interact with these tools autonomously.

## Architecture

```
User Message → Chat API (GPT-5.1) → Tool Calls → MCP Proxy Routes → Firebase Functions → Polymarket APIs
                    ↓
            System Prompt guides tool selection
                    ↓
            Results → AI Summary → User
```

## Key Components

### 1. MCP Proxy Routes (`src/app/api/mcp/`)

These Next.js API routes proxy requests to Firebase Functions:

- **`issueMcpToken/route.ts`**: Exchanges Firebase ID token for MCP bearer token
- **`polymarketReadMcp/route.ts`**: Polymarket read-only operations
- **`marketDataMcp/route.ts`**: Market data operations (e.g., BTC price)

**Environment Variables:**
```env
NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE=https://us-central1-audit-3a7ec.cloudfunctions.net
# Or for local development:
# NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE=http://127.0.0.1:5001/audit-3a7ec/us-central1
```

### 2. Authentication (`src/services/mcpAuth.ts`)

Manages MCP token lifecycle:
- Gets Firebase ID token from authenticated user
- Exchanges for MCP bearer token with appropriate scopes
- Caches token in memory (never localStorage for security)
- Auto-refreshes 5 minutes before expiry

**Scopes requested:**
- `polymarket:read:public` - Public market data
- `polymarket:read:user` - User-specific data (positions, trades)
- `polymarket:read:stream` - Streaming data
- `markets:read` - General market data (BTC price, etc.)
- `analysis:read` - Analysis tools (price comparisons)

### 3. MCP Client (`src/services/mcpClient.ts`)

Wrapper for making tool calls:
```typescript
callMcpTool('polymarketReadMcp', 'list-markets', { limit: 10, active: true })
```

Automatically:
- Gets MCP token via `getMcpToken()`
- Injects token into tool input
- Handles errors (401/403 for auth issues)

### 4. OpenAI Tools Definition (`src/lib/openaiTools.ts`)

Defines all available tools for GPT-5.1 function calling:

**Discovery Tools:**
- `list_markets` - List/filter markets
- `list_active_markets_by_volume` - Top markets by volume
- `get_market` - Market details
- `search_entities` - Search markets/events/profiles
- `list_events` / `get_event` - Event operations

**Pricing/Metrics Tools:**
- `get_market_pricing` - Current outcome pricing
- `get_price_history` - Historical price charts
- `get_live_volume` - Event trading volume
- `get_open_interest` - Money at stake
- `get_market_volume` - Market trading volume

**Analysis Tools:**
- `compare_weekly_movement` - Compare two outcomes
- `get_btc_price` - BTC spot price

**User Tools:**
- `get_user_positions` - User's current positions
- `get_user_trades` - User's trade history
- `get_total_value_of_positions` - Portfolio value

### 5. Chat API (`src/app/api/chat/route.ts`)

Orchestrates the conversation flow:

**System Prompt:**
- Identifies DrEagle as a read-only Polymarket assistant
- Provides tool selection guidance
- Includes examples of when to use each tool
- Emphasizes fetching real data vs. speculation

**Flow:**
1. Prepends system prompt to messages
2. Calls GPT-5.1 with tools enabled
3. Returns assistant message (text or tool calls)

### 6. ChatArea Component (`src/components/ChatArea.tsx`)

Frontend chat interface with tool execution:

**Tool Call Handling:**
```typescript
// 1. AI requests tool calls
if (assistantMessage.tool_calls) {
  for (const toolCall of assistantMessage.tool_calls) {
    // 2. Execute each tool via MCP
    const result = await callMcpTool(server, toolName, args);

    // 3. Add tool result to conversation
    toolMessages.push({ role: 'tool', tool_call_id, name, content: result });
  }

  // 4. Recursive call with tool results
  await processChatLoop([...messages, assistantMsg, ...toolMessages]);
}
```

**Special handling:**
- Filters tool messages from UI (shows only user/assistant)
- Maps OpenAI parameter names to MCP format (e.g., `id` → `marketIdOrSlug`)
- Routes tools to correct server (`polymarketReadMcp` vs `marketDataMcp`)

## Configuration

### Required Environment Variables

```env
# Firebase Config (already set)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# OpenAI (already set)
OPENAI_API_KEY=...

# Firebase Functions (add this)
NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE=https://us-central1-audit-3a7ec.cloudfunctions.net
```

### Firebase Authentication

Users must be signed in with Firebase Auth:
```typescript
import { auth } from '@/lib/firebase';
const user = auth.currentUser; // Must be authenticated
```

## Tool Call Examples

### Example 1: List Popular Markets

**User:** "What are the most popular markets right now?"

**AI Process:**
1. System prompt suggests: `list_active_markets_by_volume`
2. Calls tool: `{ limit: 10 }`
3. Receives market data
4. Summarizes: "Here are the top 10 markets by volume..."

### Example 2: Market Details

**User:** "Tell me about the Trump 2024 market"

**AI Process:**
1. Uses `search_entities` to find market
2. Then `get_market` with the ID/slug
3. Optionally `get_market_pricing` for current odds
4. Summarizes market details and probabilities

### Example 3: Price Comparison

**User:** "Which moved more this week: Bitcoin to $100k or Trump winning?"

**AI Process:**
1. Uses `search_entities` to find both markets
2. Calls `compare_weekly_movement` with both selections
3. Receives analysis with dominant movement
4. Explains which moved more and why

## Rate Limits

Per plan.md, non-admin users have these per-minute limits:
- Public tools: 30 requests/min
- User data tools: 10 requests/min
- Streaming tools: 5 requests/min

Rate limit errors return HTTP 403 with `AccessDeniedError`.

## Security Best Practices

1. **Token Storage:** MCP tokens stored in memory only, never localStorage
2. **Server-side Proxy:** Browser never calls Firebase Functions directly
3. **Scope Minimization:** Only request needed scopes
4. **Token Refresh:** Auto-refresh before expiry
5. **Error Handling:** 401/403 triggers re-authentication flow

## Development Workflow

### Local Development with Emulator

1. Start Firebase emulators:
```bash
firebase emulators:start
```

2. Update `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE=http://127.0.0.1:5001/audit-3a7ec/us-central1
```

3. Start Next.js dev server:
```bash
npm run dev
```

### Production

The app uses production Firebase Functions by default:
```
https://us-central1-audit-3a7ec.cloudfunctions.net
```

## Testing

### Test Tool Discovery
```bash
curl https://us-central1-audit-3a7ec.cloudfunctions.net/polymarketReadMcp
```

Should return:
```json
{
  "server": "polymarket-read",
  "tools": [...]
}
```

### Test in Chat

Try these prompts:
- "What are the top markets right now?"
- "Show me details about the Bitcoin market"
- "What's the current BTC price?"
- "What's my portfolio worth?" (requires user auth)

## Troubleshooting

### "User not authenticated"
- Ensure user is signed in with Firebase Auth
- Check `auth.currentUser` is not null

### "Failed to issue MCP token"
- Verify Firebase Functions are running
- Check `NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE` is set correctly
- Ensure user's Firebase ID token is valid

### Tool calls not working
- Check browser console for MCP errors
- Verify tool name mapping in ChatArea.tsx
- Ensure OpenAI tool definition matches MCP tool signature

### Rate limit errors
- Reduce request frequency
- Consider implementing request debouncing
- Check if you need admin privileges

## Adding New Tools

1. **Add to `openaiTools.ts`:**
```typescript
{
  type: "function",
  function: {
    name: "new_tool",
    description: "What it does",
    parameters: { ... }
  }
}
```

2. **Add handler in `ChatArea.tsx`:**
```typescript
else if (functionName === 'new_tool') {
  result = await callMcpTool('polymarketReadMcp', 'new-tool', functionArgs);
}
```

3. **Update system prompt if needed** to guide AI when to use the new tool

## Files Modified/Created

### Created:
- `src/app/api/mcp/issueMcpToken/route.ts`
- `src/app/api/mcp/polymarketReadMcp/route.ts`
- `src/app/api/mcp/marketDataMcp/route.ts`
- `INTEGRATION_GUIDE.md` (this file)

### Modified:
- `src/app/api/chat/route.ts` - Added system prompt
- `src/services/mcpAuth.ts` - Expanded scopes
- `src/lib/openaiTools.ts` - Added new tools
- `src/components/ChatArea.tsx` - Added tool handlers

## References

- Plan document: `plan.md`
- Firebase project: `audit-3a7ec`
- Model: GPT-5.1
- MCP Server docs: See plan.md sections 4-6

## Support

For issues with:
- **Chat interface:** Check ChatArea.tsx and console logs
- **Tool calls:** Review openaiTools.ts and tool handler mapping
- **Authentication:** Verify Firebase Auth and MCP token flow
- **API errors:** Check Firebase Functions logs
