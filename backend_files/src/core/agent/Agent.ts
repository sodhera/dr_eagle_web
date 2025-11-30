import { ChatSession, Message, ToolRegistry } from './types';

export type AgentStreamEvent =
    | { type: 'content'; delta: string }
    | { type: 'tool_start'; toolCallId: string; name: string }
    | { type: 'tool_end'; toolCallId: string; result: string }
    | { type: 'error'; error: string }
    | { type: 'done'; session: ChatSession };

export interface Agent {
    /**
     * Processes a user message and returns the updated session with the assistant's response.
     * This method handles the loop of calling the LLM, executing tools, and calling the LLM again.
     */
    processMessage(
        session: ChatSession,
        userMessage: string,
        toolRegistry: ToolRegistry
    ): Promise<ChatSession>;

    /**
     * Processes a user message and yields events as they happen.
     * Useful for streaming responses to the client.
     */
    processMessageStream(
        session: ChatSession,
        userMessage: string,
        toolRegistry: ToolRegistry
    ): AsyncGenerator<AgentStreamEvent, ChatSession, unknown>;
}
