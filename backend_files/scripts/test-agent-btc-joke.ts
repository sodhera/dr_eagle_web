import { ChatService } from '../src/app/agent/ChatService';
import { OpenAIAdapter } from '../src/adapters/openai/OpenAIAdapter';
import { InternalToolRegistry } from '../src/adapters/mcp/InternalToolRegistry';
import { ChatSession } from '../src/core/agent/types';
import { FirestoreChatRepository } from '../src/adapters/firestore/ChatRepository';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Mock Repo for this one-off test to avoid needing real Firestore credentials/setup in this script
class InMemoryRepo implements Partial<FirestoreChatRepository> {
    private sessions = new Map<string, ChatSession>();
    async createSession(userId: string) {
        const id = `session-${Date.now()}`;
        const session: ChatSession = {
            id,
            userId,
            messages: [],
            customInstructions: '',
            widgets: {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.sessions.set(id, session);
        return session;
    }
    async getSession(id: string) { return this.sessions.get(id) || null; }
    async updateSession(s: ChatSession) { this.sessions.set(s.id, s); }
}

async function main() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error("Please set OPENAI_API_KEY env var");
        process.exit(1);
    }

    console.log("Initializing agent with gpt-4.1-nano...");
    // Explicitly using gpt-4.1-nano here to match the request, although the entrypoint was also updated.
    const agent = new OpenAIAdapter(apiKey, "gpt-4.1-nano");
    const repo = new InMemoryRepo() as any;
    const registry = new InternalToolRegistry();
    const service = new ChatService(agent, repo, registry);

    const userId = "user-test-btc-joke";
    const message = "Tell me the price of bitcoin from polymarket and also a joke";

    console.log(`\nUser: ${message}\n`);

    try {
        const session = await service.startChat(userId, message);
        const lastMsg = session.messages[session.messages.length - 1];

        console.log(`Agent: ${lastMsg.content}`);

        // Log tool usage if any
        const toolCalls = session.messages
            .filter(m => m.role === 'assistant' && m.toolCalls)
            .flatMap(m => m.toolCalls || []);

        if (toolCalls.length > 0) {
            console.log(`\n(Tools used: ${toolCalls.map(t => t.function.name).join(', ')})`);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

main();
