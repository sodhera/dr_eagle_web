import { getMcpToken } from './mcpAuth';

// Use the proxy path defined in next.config.ts
const AGENT_BASE_URL = '/api/mcp';

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
}

// Alias for backward compatibility if needed, or just replace usages
export type ChatMessage = Message;

export async function sendMessage(message: string, sessionId?: string): Promise<ChatSession> {
    const token = await getMcpToken();

    const response = await fetch(`${AGENT_BASE_URL}/agent/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            message,
            sessionId
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function getChatHistory(sessionId: string): Promise<ChatSession> {
    const token = await getMcpToken();

    const response = await fetch(`${AGENT_BASE_URL}/agent/chat/${sessionId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get chat history: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function getUserSessions(limit: number = 20): Promise<ChatSession[]> {
    const token = await getMcpToken();

    const response = await fetch(`${AGENT_BASE_URL}/agent/sessions?limit=${limit}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get user sessions: ${response.status} ${errorText}`);
    }

    return response.json();
}
