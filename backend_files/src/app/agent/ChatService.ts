import { Agent, AgentStreamEvent } from '../../core/agent/Agent';
import { ChatSession, ToolRegistry } from '../../core/agent/types';
import { FirestoreChatRepository } from '../../adapters/firestore/ChatRepository';
import { LoggingService } from '../logging/LoggingService';

export class ChatService {
    constructor(
        private agent: Agent,
        private repository: FirestoreChatRepository,
        private toolRegistry: ToolRegistry,
        private loggingService?: LoggingService
    ) { }

    async startChat(userId: string, initialMessage?: string): Promise<ChatSession> {
        const session = await this.repository.createSession(userId);

        // Log session start
        await this.loggingService?.logSessionStart(userId, session.id);

        if (initialMessage) {
            return this.sendMessage(session.id, userId, initialMessage);
        }

        return session;
    }

    async sendMessage(sessionId: string, userId: string, content: string): Promise<ChatSession> {
        const session = await this.repository.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.userId !== userId) {
            throw new Error('Unauthorized access to session');
        }

        // 1. Capture message count before processing
        const previousMessageCount = session.messages.length;

        // 2. Process message via Agent (handles LLM loop and tools)
        const updatedSession = await this.agent.processMessage(session, content, this.toolRegistry);

        // 3. Persist updated session
        await this.repository.updateSession(updatedSession);

        // 4. Return session with only new messages (delta), excluding the user message
        // Frontend already has the user message, so we skip it with +1
        const newMessages = updatedSession.messages.slice(previousMessageCount + 1);

        return {
            ...updatedSession,
            messages: newMessages // Only include assistant/tool responses
        };
    }

    async *streamMessage(sessionId: string, userId: string, content: string): AsyncGenerator<AgentStreamEvent, void, unknown> {
        const session = await this.repository.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.userId !== userId) {
            throw new Error('Unauthorized access to session');
        }

        const stream = this.agent.processMessageStream(session, content, this.toolRegistry);

        for await (const event of stream) {
            yield event;

            if (event.type === 'done') {
                // Persist the final session state
                await this.repository.updateSession(event.session);
            }
        }
    }

    async getChat(sessionId: string, userId: string): Promise<ChatSession> {
        const session = await this.repository.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.userId !== userId) {
            throw new Error('Unauthorized access to session');
        }

        return session;
    }

    async updateCustomInstructions(sessionId: string, userId: string, instructions: string): Promise<ChatSession> {
        const session = await this.repository.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.userId !== userId) {
            throw new Error('Unauthorized access to session');
        }

        session.customInstructions = instructions;
        session.updatedAt = Date.now();

        await this.repository.updateSession(session);
        return session;
    }

    async listUserSessions(userId: string, limit: number = 20): Promise<ChatSession[]> {
        return this.repository.getUserSessions(userId, limit);
    }

    async deleteSession(sessionId: string, userId: string): Promise<void> {
        const session = await this.repository.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        if (session.userId !== userId) {
            throw new Error('Unauthorized access to session');
        }
        await this.repository.deleteSession(sessionId);
    }

    async renameSession(sessionId: string, userId: string, title: string): Promise<ChatSession> {
        const session = await this.repository.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        if (session.userId !== userId) {
            throw new Error('Unauthorized access to session');
        }
        session.title = title;
        session.updatedAt = Date.now();
        await this.repository.updateSession(session);
        return session;
    }
}
