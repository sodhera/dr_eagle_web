# Frontend Integration Guide

This guide explains how to integrate the DREAGLE backend agent into your frontend application.

## Base URL
The Cloud Functions are hosted at:
`https://us-central1-audit-3a7ec.cloudfunctions.net`

(Project ID: `audit-3a7ec`)

## Authentication

All agent endpoints require a **Bearer Token**. This token is distinct from the Firebase ID token.

### Step 1: Get Backend Token
Exchange your Firebase Auth ID token for a backend access token.

**Endpoint:** `POST /issueMcpToken`
**Full URL:** `https://us-central1-audit-3a7ec.cloudfunctions.net/issueMcpToken`
**Headers:** `Content-Type: application/json`
**Body:**
```json
{
  "idToken": "<firebase-id-token>",
  "scopes": ["polymarket:read:public"] 
}
```

**Response:**
```json
{
  "token": "eyJhbGc...", // <--- Use this as your Bearer token
  "claims": { ... }
}
```

## Agent Chat API

### Start or Continue Chat
Send a message to the agent.

**Endpoint:** `POST /agent/chat`
**Full URL:** `https://us-central1-audit-3a7ec.cloudfunctions.net/agent/chat`
**Headers:** 
- `Content-Type: application/json`
- `Authorization: Bearer <backend-token>`

**Body:**
```json
{
  "message": "What is the price of BTC?",
  "sessionId": "optional-session-id-to-continue-chat"
}
```

**Response (`ChatSession` with Delta Messages):**

> **⚡ Performance Optimization:** The `/chat` endpoint returns **only the assistant/tool responses** from the current turn (delta response), excluding the user message (which the frontend already has). This dramatically reduces payload size for long conversations.

```json
{
  "id": "session-123",
  "userId": "user-abc",
  "messages": [
    // ONLY the assistant response (user message excluded since frontend has it)
    {
      "role": "assistant",
      "content": "The current price of Bitcoin is $91,384.",
      "timestamp": 1732780005
    }
  ],
  "customInstructions": "",
  "widgets": {},
  "updatedAt": 1732780005,
  "createdAt": 1732780000
}
```

**Frontend Integration:**
- Append the returned `messages` array to your local session state
- Use `GET /agent/chat/:sessionId` to fetch the full history if needed (e.g., on page refresh)
- Delta responses work for both new and continuing sessions
- Append the returned `messages` array to your local session state

### Streaming Chat API (Real-time)
For a better user experience, use the streaming endpoint to receive the response token-by-token.

**Endpoint:** `POST /agent/chat/stream`
**Headers:** 
- `Content-Type: application/json`
- `Authorization: Bearer <backend-token>`
- `Accept: text/event-stream`

**Body:** Same as `/chat` (`{ message, sessionId }`).

**Events (SSE):**
The server sends JSON objects prefixed with `data: `.

1.  **Content Delta** (The text appearing):
    ```json
    { "type": "content", "delta": "Hello" }
    { "type": "content", "delta": " world" }
    ```

2.  **Tool Execution** (Agent is thinking/acting):
    ```json
    { "type": "tool_start", "toolCallId": "call_123", "name": "get_btc_price" }
    { "type": "tool_end", "toolCallId": "call_123", "result": "..." }
    ```

3.  **Completion**:
    ```json
    { "type": "done", "session": { ...full session object... } }
    ```

4.  **Error**:
    ```json
    { "type": "error", "error": "Something went wrong" }
    ```

**Frontend Integration:**
Use `EventSource` or `fetch` with a stream reader.
```javascript
const response = await fetch('/agent/chat/stream', { ... });
const reader = response.body.getReader();
// Read loop...
```



### List User Sessions
Retrieve a list of past chat sessions for the authenticated user.

**Endpoint:** `GET /agent/sessions`
**Full URL:** `https://us-central1-audit-3a7ec.cloudfunctions.net/agent/sessions`
**Headers:** `Authorization: Bearer <backend-token>`
**Query Parameters:**
- `limit` (optional): Number of sessions to return (default 20).

**Response:**
```json
[
  {
    "id": "session-123",
    "userId": "user-abc",
    "createdAt": 1732780000,
    "updatedAt": 1732780005,
    "messages": [...] // Full session objects
  },
  ...
]
```

### Get Chat History
Retrieve the history of a specific chat session.

**Endpoint:** `GET /agent/chat/:sessionId`
**Full URL:** `https://us-central1-audit-3a7ec.cloudfunctions.net/agent/chat/:sessionId`
**Headers:** `Authorization: Bearer <backend-token>`

**Response:** Returns the same `ChatSession` object as above.

### Session Management

#### Delete Session
**Endpoint:** `DELETE /agent/chat/:sessionId`
**Headers:** `Authorization: Bearer <backend-token>`
**Response:**
```json
{ "success": true }
```

#### Rename Session
**Endpoint:** `PATCH /agent/chat/:sessionId`
**Headers:** `Authorization: Bearer <backend-token>`
**Body:**
```json
{ "title": "New Session Title" }
```
**Response:** Returns the updated `ChatSession` object.

## Error Handling

- **401 Unauthorized**: Token missing or invalid.
- **403 Forbidden**: Access denied (e.g., trying to access another user's chat).
- **404 Not Found**: Session not found.
- **500 Internal Server Error**: Something went wrong on the server.

## Notes
- The agent uses `gpt-4.1-nano`.
- It has access to real-time tools (Polymarket, Crypto Prices).
- Chat history is persisted automatically.

## Tracking System (Updated)

The backend supports a robust Tracking System for monitoring markets, events, and news.

### Supported Targets
1.  **Polymarket Markets**: Track price, volume, and probability changes.
2.  **Polymarket Events**: Track event-level metrics.
3.  **Google News RSS (New)**: Track news articles for specific queries and regions.

### Concepts
-   **Tracker**: A persistent job that monitors a specific target.
-   **Mode**: `regular` (checks on schedule) or `irregular` (checks only when triggered).
-   **Analysis**: 
    -   `computational`: Uses Python scripts to detect threshold breaches.
    -   `ai`: Uses LLM personas to analyze qualitative changes (e.g., "Is this news relevant to the election?").

### Tracking Workspace & Agent Interaction
The "Tracking Workspace" is a conceptual mode where the **Main Agent** (Chat) interacts with the **Tracking Agent** (Backend Service).

**How it works:**
1.  **User Intent**: User says "Monitor Nigeria for election news."
2.  **Main Agent**: 
    -   Uses `list_editions` to find the correct region (e.g., "US:en").
    -   Uses `build_search_feed` to validate the query.
    -   Calls `create_tracker` to register the job in the system.
3.  **Tracking Agent**:
    -   Runs in the background (e.g., every 3 hours).
    -   Fetches data (RSS feed, Market API).
    -   Performs AI analysis on new items.
    -   Logs notifications/alerts.
4.  **Reporting**: User asks "Any updates?", and the Main Agent queries the tracker history to report back.

### Integration Guide

**1. Creating Trackers**
The primary way to create trackers is through the **Chat Interface**.
-   *User*: "Track the price of Bitcoin."
-   *User*: "Alert me if there is news about 'SpaceX' in the US."

**2. Visualizing Trackers**
If you are building a dedicated UI for trackers, you can use the agent to fetch data or (in the future) hit dedicated endpoints.
-   **List Trackers**: Ask the agent "List my active trackers" -> Agent calls `list_trackers`.
-   **Status**: Ask "Is my Nigeria tracker running?" -> Agent calls `get_tracker_status`.

**3. Google News Specifics**
-   **Editions**: The system supports regional editions (US, UK, India, etc.).
-   **Queries**: Supports complex operators (`AND`, `OR`, `site:`, `when:24h`).
-   **Privacy**: Queries are validated and executed server-side; no user IP exposure to Google.

### Available Tools (Agent & MCP)
-   `create_tracker`: Create a new tracker.
-   `list_trackers`: List user's trackers.
-   `run_tracker_now`: Force a run immediately.
-   `get_tracker_status`: Check status.
-   `list_editions`: (Google News) List supported regions.
-   `build_search_feed`: (Google News) Construct and validate a query.
-   `preview_search_feed`: (Google News) See live results before tracking.

**Notifications**:
Trackers generate notifications based on analysis. Currently, these are stored in the backend. Future updates will support push notifications or webhooks.