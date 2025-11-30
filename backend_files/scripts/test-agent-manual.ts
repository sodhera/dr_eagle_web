import * as readline from 'readline';
import { ChatService } from '../src/app/agent/ChatService';
import { OpenAIAdapter } from '../src/adapters/openai/OpenAIAdapter';
import { InternalToolRegistry } from '../src/adapters/mcp/InternalToolRegistry';
import { ChatSession } from '../src/core/agent/types';
import { FirestoreChatRepository } from '../src/adapters/firestore/ChatRepository';

// Mock Repo for manual test
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

    console.log("Initializing agent...");
    const agent = new OpenAIAdapter(apiKey);
    const repo = new InMemoryRepo() as any;
    const registry = new InternalToolRegistry();
    const service = new ChatService(agent, repo, registry);

    const session = await service.startChat("user-manual");
    console.log(`Chat started: ${session.id}`);
    console.log("Type 'exit' to quit.");

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const ask = () => {
        rl.question('You: ', async (input) => {
            if (input.toLowerCase() === 'exit') {
                rl.close();
                return;
            }
            try {
                process.stdout.write("Agent thinking...\r");
                const updated = await service.sendMessage(session.id, "user-manual", input);
                const lastMsg = updated.messages[updated.messages.length - 1];

                // Find tool calls in the history for this turn
                const lastUserMsgIndex = updated.messages.findLastIndex(m => m.role === 'user');
                const assistantMsgs = updated.messages.slice(lastUserMsgIndex + 1);
                const toolCalls = assistantMsgs.flatMap(m => m.toolCalls || []);

                console.log(`Agent: ${lastMsg.content}`);
                if (toolCalls.length > 0) {
                    console.log(`(Tools used: ${toolCalls.map(t => t.function.name).join(', ')})`);
                }
            } catch (e) {
                console.error("\nError:", e);
            }
            ask();
        });
    };

    ask();
}

main();
