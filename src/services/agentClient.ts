import { getMcpToken } from './mcpAuth';

const AGENT_BASE_URL = 'https://us-central1-audit-3a7ec.cloudfunctions.net';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
}

export interface ChatSession {
    id: string;
    userId: string;
    messages: ChatMessage[];
    customInstructions?: string;
}

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
