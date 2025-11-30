
export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCalls?: ToolCall[];
    toolCallId?: string;
    timestamp: number;
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

export interface ChatSession {
    id: string;
    userId: string;
    title?: string;
    createdAt: number;
    updatedAt: number;
    messages: Message[];
    customInstructions: string;
    widgets: Record<string, any>;
}

export interface AgentConfig {
    model: string;
    systemPrompt: string;
}

export interface ToolRegistry {
    getTool(name: string): InternalTool | undefined;
    getTools(): InternalTool[];
}

export interface InternalTool {
    name: string;
    description: string;
    parameters: any; // JSON Schema
    execute(args: any, context: { userId: string }): Promise<any>;
}
