# Backend Optimization Task: Implement Delta Responses for Chat

**Goal:** Optimize the `/chat` (or `sendMessage`) API endpoint to return **only the new messages** generated in the current turn, rather than the entire session history.

**Why:**
Currently, the API returns the full `ChatSession` object, including `messages: [All 100+ messages...]`.
1.  **Performance:** As the chat grows, the payload size increases linearly, causing slower network transfers.
2.  **Latency:** The frontend has to re-process the entire list every time.
3.  **Efficiency:** We only need the 2-3 new messages (User -> Assistant -> Tool -> Assistant) to update the UI.

---

## Implementation Instructions

Locate the API Handler / Controller where `agent.processMessage()` is called.

### 1. Capture State Before Execution
Before calling the agent, store the count of existing messages.

### 2. Calculate the Delta
After the agent returns the `updatedSession`, slice the `messages` array to get only the new ones.

### 3. Return the Delta
Send only the new messages in the JSON response.

---

## Code Example (TypeScript / Node.js)

### ❌ Current Implementation (Inefficient)
```typescript
// In your Controller / Route Handler
const session = await sessionService.getSession(sessionId);

// The agent adds new messages to the session
const updatedSession = await agent.processMessage(session, userMessage, toolRegistry);

// RETURNS EVERYTHING (Bad for large chats)
return res.json(updatedSession); 
```

### ✅ Optimized Implementation (Delta Pattern)
```typescript
// In your Controller / Route Handler
const session = await sessionService.getSession(sessionId);

// 1. Capture the "Before" count
const previousMessageCount = session.messages.length;

// 2. Run the Agent (which adds User + Assistant + Tool messages)
const updatedSession = await agent.processMessage(session, userMessage, toolRegistry);

// 3. Calculate the Delta (New messages only)
// We slice from (previousMessageCount + 1) to skip the User message and get only Assistant/Tool responses
const newMessages = updatedSession.messages.slice(previousMessageCount + 1);

// 4. Return the Delta
return res.json({
    id: updatedSession.id,
    // explicitly return ONLY the new items
    messages: newMessages, 
    // You can keep other metadata if needed
    updatedAt: updatedSession.updatedAt
});
```

---

## Frontend Compatibility
The frontend has already been updated to handle this "Delta" pattern.
- It checks the timestamps of incoming messages.
- It appends them to its local list.
- **It works with both full history AND delta history**, so this backend change is safe to deploy immediately.
