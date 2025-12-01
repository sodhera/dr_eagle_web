export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCalls?: ToolCall[];
    toolCallId?: string;
    timestamp: number;
}

export interface ChatSession {
    id: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    messages: Message[];
    customInstructions: string;
    widgets: Record<string, any>;
    title?: string;
}

// Alias for backward compatibility
export type ChatMessage = Message;

export type AgentStreamEvent =
    | { type: 'session_start'; sessionId: string }
    | { type: 'content'; delta: string }
    | { type: 'tool_start'; toolCallId: string; name: string }
    | { type: 'tool_end'; toolCallId: string; result: string }
    | { type: 'done'; session: ChatSession }
    | { type: 'error'; error: string };
