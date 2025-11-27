# DrEagle Chat - Quick Start Guide

## Overview
Your chat application is now integrated with the Polymarket MCP server. GPT-5.1 can autonomously make tool calls to fetch real Polymarket data and answer user questions.

## Prerequisites
- Node.js installed
- Firebase account with authentication enabled
- OpenAI API key with GPT-5.1 access

## Setup

### 1. Environment Variables
The `.env.local` file has been updated with all required variables:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
OPENAI_API_KEY=...
NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE=https://us-central1-audit-3a7ec.cloudfunctions.net
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How It Works

### Tool Calling Flow

1. **User asks a question:**
   ```
   "What are the most popular markets right now?"
   ```

2. **GPT-5.1 decides which tools to call:**
   - System prompt guides tool selection
   - Chooses `list_active_markets_by_volume`

3. **Frontend executes tool call:**
   - Calls `/api/mcp/polymarketReadMcp` proxy
   - Proxy forwards to Firebase Functions
   - Returns Polymarket data

4. **GPT-5.1 processes results:**
   - Receives tool results
   - Generates natural language response
   - User sees: "Here are the top 10 markets..."

### Example Prompts to Try

**Market Discovery:**
- "What are the most popular markets right now?"
- "Show me all political markets"
- "Search for Bitcoin-related markets"

**Market Details:**
- "Tell me about the Trump 2024 market"
- "What are the current odds for Bitcoin reaching $100k?"
- "Show me details about market [ID or name]"

**Price Analysis:**
- "What's the BTC price?"
- "Which moved more this week: [market A] vs [market B]?"
- "Show me price history for [token]"

**Volume/Interest:**
- "What's the total volume for this market?"
- "How much money is at stake in the Trump market?"
- "Which events have the highest trading volume?"

**User Portfolio (requires auth):**
- "What's my portfolio worth?"
- "Show me my positions"
- "What trades have I made recently?"

## Available Tools

The AI has access to these tool categories:

### Discovery (18 tools)
- `list_markets`, `list_active_markets_by_volume`
- `get_market`, `search_entities`
- `list_events`, `get_event`
- And more...

### Pricing/Metrics (10 tools)
- `get_market_pricing`, `get_price_history`
- `get_live_volume`, `get_open_interest`
- `get_market_volume`

### Analysis (2 tools)
- `compare_weekly_movement`
- `get_btc_price`

### User Data (3 tools)
- `get_user_positions`
- `get_user_trades`
- `get_total_value_of_positions`

**Total: 20+ tools** defined in [src/lib/openaiTools.ts](src/lib/openaiTools.ts)

## System Architecture

```
┌─────────────┐
│   User UI   │
│ (ChatArea)  │
└──────┬──────┘
       │
       ↓
┌──────────────┐      ┌──────────────────┐
│  /api/chat   │ ───→ │   GPT-5.1 with   │
│ (Next.js)    │ ←─── │  System Prompt   │
└──────┬───────┘      └──────────────────┘
       │                       │
       │                   Tool Calls
       │                       ↓
       │               ┌──────────────┐
       └──────────────→│ ChatArea.tsx │
                       │ Tool Handler │
                       └──────┬───────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │  MCP Proxy APIs  │
                    │   /api/mcp/*     │
                    └──────┬───────────┘
                           │
                           ↓
                  ┌─────────────────────┐
                  │ Firebase Functions  │
                  │  polymarketReadMcp  │
                  │   marketDataMcp     │
                  └──────┬──────────────┘
                         │
                         ↓
                 ┌───────────────┐
                 │  Polymarket   │
                 │     APIs      │
                 └───────────────┘
```

## Authentication

Users must be signed in with Firebase Authentication:
- The app uses Firebase Auth SDK
- MCP token is issued per-user session
- Tokens cached in memory (1-hour TTL)
- Auto-refreshes 5 minutes before expiry

## Rate Limits

Per user, per minute:
- **Public tools:** 30 requests
- **User data tools:** 10 requests
- **Streaming tools:** 5 requests

The system handles rate limit errors gracefully.

## Development Tips

### Check Tool Execution
Open browser console to see:
```
🛠️ [MCP] Calling tool: list_markets { limit: 10, active: true }
✅ [MCP] Result from list_markets: {...}
```

### Test Individual Tools
Use the mcpClient directly:
```typescript
import { callMcpTool } from '@/services/mcpClient';

const markets = await callMcpTool('polymarketReadMcp', 'list-markets', {
  limit: 5,
  active: true
});
```

### Modify System Prompt
Edit [src/app/api/chat/route.ts](src/app/api/chat/route.ts) to adjust AI behavior.

### Add New Tools
1. Define in `src/lib/openaiTools.ts`
2. Add handler in `src/components/ChatArea.tsx`
3. Optionally update system prompt

## Troubleshooting

### "User not authenticated"
- User must sign in with Firebase Auth first
- Check if `auth.currentUser` exists

### Tool calls failing
- Check browser console for errors
- Verify Firebase Functions are running
- Test with: `curl https://us-central1-audit-3a7ec.cloudfunctions.net/polymarketReadMcp`

### AI not using tools
- Check system prompt in chat API
- Verify tools are defined in openaiTools.ts
- Try more explicit prompts

### Rate limiting
- Reduce request frequency
- Implement debouncing
- Consider caching results

## Next Steps

1. **Test the integration:**
   - Start the dev server
   - Sign in a user
   - Try the example prompts above

2. **Customize the experience:**
   - Modify system prompt for different personality
   - Add more tools from plan.md
   - Enhance UI to show tool calls

3. **Deploy:**
   - Build for production: `npm run build`
   - Deploy to Vercel/your platform
   - Ensure environment variables are set

## Resources

- **Full Integration Guide:** [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- **Plan Document:** [plan.md](plan.md)
- **Firebase Console:** https://console.firebase.google.com
- **OpenAI Docs:** https://platform.openai.com/docs

## Support

If you encounter issues:
1. Check browser console logs
2. Review [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
3. Verify all environment variables are set
4. Test Firebase Functions directly

Happy building! 🚀
