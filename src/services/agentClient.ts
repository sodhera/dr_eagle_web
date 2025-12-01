import { getMcpToken } from './mcpAuth';
import { ChatSession, Message, AgentStreamEvent } from '@/types/chat';

// Re-export types for backward compatibility if needed by other files importing from here
export type { ChatSession, Message, ToolCall, ChatMessage } from '@/types/chat';

// Fixed URL as per plan.md
const AGENT_BASE_URL = 'https://us-central1-audit-3a7ec.cloudfunctions.net';

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

export async function* streamChat(message: string, sessionId?: string): AsyncGenerator<AgentStreamEvent, void, unknown> {
    const token = await getMcpToken();

    const response = await fetch(`${AGENT_BASE_URL}/agent/chat/stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
            message,
            sessionId
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start stream: ${response.status} ${errorText}`);
    }

    if (!response.body) {
        throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const extractEvents = (): string[] => {
        const events: string[] = [];
        buffer = buffer.replace(/\r/g, '');

        let delimiterIndex = buffer.indexOf('\n\n');
        while (delimiterIndex !== -1) {
            const rawEvent = buffer.slice(0, delimiterIndex).trim();
            buffer = buffer.slice(delimiterIndex + 2);

            if (rawEvent) {
                const dataLines = rawEvent
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.startsWith('data:'));

                if (dataLines.length > 0) {
                    const payload = dataLines
                        .map(line => line.replace(/^data:\s*/, ''))
                        .join('\n');

                    if (payload !== '[DONE]') {
                        events.push(payload);
                    }
                }
            }

            delimiterIndex = buffer.indexOf('\n\n');
        }
        return events;
    };

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                buffer += decoder.decode();
                const remainingEvents = extractEvents();
                for (const payload of remainingEvents) {
                    try {
                        const event = JSON.parse(payload) as AgentStreamEvent;
                        yield event;
                    } catch (e) {
                        console.error('Error parsing SSE data:', e, payload);
                    }
                }
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const events = extractEvents();
            for (const payload of events) {
                try {
                    const event = JSON.parse(payload) as AgentStreamEvent;
                    yield event;
                } catch (e) {
                    console.error('Error parsing SSE data:', e, payload);
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
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

export async function renameSession(sessionId: string, title: string): Promise<void> {
    const token = await getMcpToken();

    // Assuming the backend accepts a PATCH request with the new title
    // If the backend doesn't support 'title' directly, we might need to adjust this.
    // Based on the plan, we proceed with this assumption.
    const response = await fetch(`${AGENT_BASE_URL}/agent/chat/${sessionId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to rename session: ${response.status} ${errorText}`);
    }
}

export async function deleteSession(sessionId: string): Promise<void> {
    const token = await getMcpToken();

    const response = await fetch(`${AGENT_BASE_URL}/agent/chat/${sessionId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete session: ${response.status} ${errorText}`);
    }
}
