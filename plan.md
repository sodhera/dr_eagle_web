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

## Frontend Implementation Guide

### 1. Types
Copy these TypeScript interfaces to your frontend project:

```typescript
export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCalls?: ToolCall[];
    toolCallId?: string;
    timestamp: number;
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

export interface ChatSession {
    id: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    messages: Message[];
    customInstructions: string;
    widgets: Record<string, any>;
}
```

### 2. Chat Flow Implementation

1.  **Initialize**: When the user opens the chat view, call `GET /agent/sessions` to show history.
2.  **New Chat**:
    -   When the user types the first message, call `POST /agent/chat` with `{ message: "..." }` (no `sessionId`).
    -   Save the returned `id` as the current `sessionId`.
3.  **Continue Chat**:
    -   For subsequent messages, call `POST /agent/chat` with `{ message: "...", sessionId: "current-id" }`.
    -   Replace your local messages list with the `messages` array from the response to stay in sync.

### 3. Real-time Updates (Optional but Recommended)
The backend stores chats in Firestore. You can listen to the document directly for real-time updates (e.g., if the agent takes time to reply or for multi-device sync).

**Collection Path:** `agent_chats/{sessionId}`

**Security:**
-   Users can only read/write their own documents.
-   You must use the **Firebase Client SDK** initialized with the same user.

```typescript
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase"; // Your initialized firestore instance

const subscribeToChat = (sessionId: string, callback: (session: ChatSession) => void) => {
    return onSnapshot(doc(db, "agent_chats", sessionId), (doc) => {
        if (doc.exists()) {
            callback(doc.data() as ChatSession);
        }
    });
};
```

## Error Handling

- **401 Unauthorized**: Token missing or invalid.
- **403 Forbidden**: Access denied (e.g., trying to access another user's chat).
- **404 Not Found**: Session not found.
- **500 Internal Server Error**: Something went wrong on the server.

## Notes
- The agent uses `gpt-4o-mini`.
- It has access to real-time tools (Polymarket, Crypto Prices).
- Chat history is persisted automatically.
