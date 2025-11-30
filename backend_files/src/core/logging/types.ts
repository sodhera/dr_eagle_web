/**
 * Core logging types and interfaces for the dual-write logging system.
 * Defines structured log entries for chat, MCP, Python execution, and session tracking.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogType =
    | 'chat'
    | 'mcpInvocation'
    | 'pythonExecution'
    | 'agentAction'
    | 'sessionStart'
    | 'sessionEnd';

/**
 * Base structure for all log entries.
 */
export interface BaseLogEntry {
    timestamp: number; // Unix timestamp in milliseconds
    userId: string;
    sessionId: string;
    logType: LogType;
    level: LogLevel;
    environment: string; // 'development' | 'staging' | 'production'
    version: string; // Application version
    metadata?: Record<string, any>; // Additional context
}

/**
 * Log entry for chat messages (user messages and assistant responses).
 */
export interface ChatLogEntry extends BaseLogEntry {
    logType: 'chat';
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    messageId?: string;
    toolCalls?: {
        id: string;
        toolName: string;
        arguments: string;
    }[];
    toolCallId?: string; // For tool response messages
}

/**
 * Log entry for MCP tool invocations.
 */
export interface McpInvocationLogEntry extends BaseLogEntry {
    logType: 'mcpInvocation';
    toolName: string;
    arguments: Record<string, any>;
    result?: any;
    error?: string;
    durationMs: number;
    success: boolean;
}

/**
 * Log entry for Python code execution.
 */
export interface PythonExecutionLogEntry extends BaseLogEntry {
    logType: 'pythonExecution';
    code: string;
    inputData?: Record<string, any>;
    output?: string;
    error?: string;
    durationMs: number;
    success: boolean;
}

/**
 * Log entry for agent-level actions and state changes.
 */
export interface AgentActionLogEntry extends BaseLogEntry {
    logType: 'agentAction';
    action: string; // e.g., 'thinking', 'tool_selection', 'response_generation'
    details?: Record<string, any>;
}

/**
 * Log entry for session lifecycle events.
 */
export interface SessionLogEntry extends BaseLogEntry {
    logType: 'sessionStart' | 'sessionEnd';
    customInstructions?: string;
    totalMessages?: number; // For sessionEnd
    totalTools?: number; // For sessionEnd
}

/**
 * Union type of all log entry types.
 */
export type LogEntry =
    | ChatLogEntry
    | McpInvocationLogEntry
    | PythonExecutionLogEntry
    | AgentActionLogEntry
    | SessionLogEntry;

/**
 * Interface for any logger implementation (Firestore, BigQuery, etc.)
 */
export interface Logger {
    log(entry: LogEntry): Promise<void>;
}
