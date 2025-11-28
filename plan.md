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

**Response (`ChatSession`):**
```json
{
  "id": "session-123",
  "userId": "user-abc",
  "messages": [
    {
      "role": "user",
      "content": "What is the price of BTC?",
      "timestamp": 1732780000
    },
    {
      "role": "assistant",
      "content": "The current price of Bitcoin is $91,384.",
      "timestamp": 1732780005
    }
  ],
  "customInstructions": "",
  "widgets": {}
}
```

### Get Chat History
Retrieve the history of a specific chat session.

**Endpoint:** `GET /agent/chat/:sessionId`
**Full URL:** `https://us-central1-audit-3a7ec.cloudfunctions.net/agent/chat/:sessionId`
**Headers:** `Authorization: Bearer <backend-token>`

**Response:** Returns the same `ChatSession` object as above.

## Error Handling

- **401 Unauthorized**: Token missing or invalid.
- **403 Forbidden**: Access denied (e.g., trying to access another user's chat).
- **404 Not Found**: Session not found.
- **500 Internal Server Error**: Something went wrong on the server.

## Notes
- The agent uses `gpt-5-mini`.
- It has access to real-time tools (Polymarket, Crypto Prices).
- Chat history is persisted automatically.