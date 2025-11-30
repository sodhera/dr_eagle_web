import assert from "node:assert";
import { test } from "node:test";
import { ChatService } from "../../src/app/agent/ChatService";
import { Agent } from "../../src/core/agent/Agent";
import { ChatSession, ToolRegistry } from "../../src/core/agent/types";
import { FirestoreChatRepository } from "../../src/adapters/firestore/ChatRepository";

// Mocks
class MockAgent implements Agent {
    async processMessage(session: ChatSession, userMessage: string, toolRegistry: ToolRegistry): Promise<ChatSession> {
        const newSession = { ...session };
        newSession.messages.push({
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        });
        newSession.messages.push({
            role: 'assistant',
            content: `Echo: ${userMessage}`,
            timestamp: Date.now()
        });
        return newSession;
    }
}

class MockRepo implements Partial<FirestoreChatRepository> {
    private sessions = new Map<string, ChatSession>();

    async createSession(userId: string): Promise<ChatSession> {
        const id = `session-${Date.now()}`;
        const session: ChatSession = {
            id,
            userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [],
            customInstructions: '',
            widgets: {}
        };
        this.sessions.set(id, session);
        return session;
    }

    async getSession(sessionId: string): Promise<ChatSession | null> {
        return this.sessions.get(sessionId) || null;
    }

    async updateSession(session: ChatSession): Promise<void> {
        this.sessions.set(session.id, session);
    }
}

class MockToolRegistry implements ToolRegistry {
    getTool(name: string) { return undefined; }
    getTools() { return []; }
}

test("ChatService Flow", async (t) => {
    const agent = new MockAgent();
    const repo = new MockRepo() as any;
    const registry = new MockToolRegistry();
    const service = new ChatService(agent, repo, registry);

    await t.test("startChat creates a session", async () => {
        const session = await service.startChat("user1");
        assert.ok(session.id);
        assert.strictEqual(session.userId, "user1");
        assert.strictEqual(session.messages.length, 0);
    });

    await t.test("startChat with message sends message", async () => {
        const session = await service.startChat("user1", "Hello");
        // Delta response: only assistant message (user message excluded)
        assert.strictEqual(session.messages.length, 1);
        assert.strictEqual(session.messages[0].role, "assistant");
        assert.strictEqual(session.messages[0].content, "Echo: Hello");
    });

    await t.test("sendMessage returns only new messages (delta), excluding user message", async () => {
        const session = await service.startChat("user1");

        // First message - should return only assistant response (not user message)
        const updated1 = await service.sendMessage(session.id, "user1", "First");
        assert.strictEqual(updated1.messages.length, 1); // Only assistant response
        assert.strictEqual(updated1.messages[0].role, "assistant");
        assert.strictEqual(updated1.messages[0].content, "Echo: First");

        // Second message - should also only return assistant response
        const updated2 = await service.sendMessage(session.id, "user1", "Second");
        assert.strictEqual(updated2.messages.length, 1); // Only assistant response
        assert.strictEqual(updated2.messages[0].role, "assistant");
        assert.strictEqual(updated2.messages[0].content, "Echo: Second");

        // Verify full persistence: getChat should have all 4 messages (2 user + 2 assistant)
        const fetched = await service.getChat(session.id, "user1");
        assert.strictEqual(fetched.messages.length, 4); // All messages stored
    });

    await t.test("updateCustomInstructions", async () => {
        const session = await service.startChat("user1");
        await service.updateCustomInstructions(session.id, "user1", "Be polite");
        const fetched = await service.getChat(session.id, "user1");
        assert.strictEqual(fetched.customInstructions, "Be polite");
    });
});
