import { Logger, LogEntry, LogLevel, ChatLogEntry, McpInvocationLogEntry, PythonExecutionLogEntry, AgentActionLogEntry, SessionLogEntry } from '../../core/logging/types';

export interface LoggingServiceConfig {
    loggers: Logger[]; // Array of loggers (Firestore, BigQuery, etc.)
    environment: string; // 'development' | 'staging' | 'production'
    version: string; // Application version
    minLogLevel?: LogLevel; // Minimum level to log (default: 'info')
}

/**
 * Centralized logging service that orchestrates writes to multiple log destinations.
 * Supports Firestore + BigQuery dual writes with graceful error handling.
 */
export class LoggingService {
    private loggers: Logger[];
    private environment: string;
    private version: string;
    private minLogLevel: LogLevel;
    private logLevelPriority: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };

    constructor(config: LoggingServiceConfig) {
        this.loggers = config.loggers;
        this.environment = config.environment;
        this.version = config.version;
        this.minLogLevel = config.minLogLevel || 'info';
    }

    /**
     * Logs a chat message (user or assistant message).
     */
    async logChatMessage(
        userId: string,
        sessionId: string,
        role: 'user' | 'assistant' | 'system' | 'tool',
        content: string,
        options?: {
            level?: LogLevel;
            messageId?: string;
            toolCalls?: ChatLogEntry['toolCalls'];
            toolCallId?: string;
            metadata?: Record<string, any>;
        }
    ): Promise<void> {
        const entry: ChatLogEntry = {
            timestamp: Date.now(),
            userId,
            sessionId,
            logType: 'chat',
            level: options?.level || 'info',
            environment: this.environment,
            version: this.version,
            role,
            content,
            messageId: options?.messageId,
            toolCalls: options?.toolCalls,
            toolCallId: options?.toolCallId,
            metadata: options?.metadata,
        };

        await this.log(entry);
    }

    /**
     * Logs an MCP tool invocation.
     */
    async logMcpInvocation(
        userId: string,
        sessionId: string,
        toolName: string,
        args: Record<string, any>,
        result: { success: boolean; data?: any; error?: string; durationMs: number }
    ): Promise<void> {
        const entry: McpInvocationLogEntry = {
            timestamp: Date.now(),
            userId,
            sessionId,
            logType: 'mcpInvocation',
            level: result.success ? 'info' : 'error',
            environment: this.environment,
            version: this.version,
            toolName,
            arguments: args,
            result: result.data,
            error: result.error,
            durationMs: result.durationMs,
            success: result.success,
        };

        await this.log(entry);
    }

    /**
     * Logs Python code execution.
     */
    async logPythonExecution(
        userId: string,
        sessionId: string,
        code: string,
        result: {
            success: boolean;
            output?: string;
            error?: string;
            durationMs: number;
            inputData?: Record<string, any>;
        }
    ): Promise<void> {
        const entry: PythonExecutionLogEntry = {
            timestamp: Date.now(),
            userId,
            sessionId,
            logType: 'pythonExecution',
            level: result.success ? 'info' : 'error',
            environment: this.environment,
            version: this.version,
            code,
            inputData: result.inputData,
            output: result.output,
            error: result.error,
            durationMs: result.durationMs,
            success: result.success,
        };

        await this.log(entry);
    }

    /**
     * Logs an agent-level action.
     */
    async logAgentAction(
        userId: string,
        sessionId: string,
        action: string,
        details?: Record<string, any>,
        level: LogLevel = 'debug'
    ): Promise<void> {
        const entry: AgentActionLogEntry = {
            timestamp: Date.now(),
            userId,
            sessionId,
            logType: 'agentAction',
            level,
            environment: this.environment,
            version: this.version,
            action,
            details,
        };

        await this.log(entry);
    }

    /**
     * Logs session start event.
     */
    async logSessionStart(
        userId: string,
        sessionId: string,
        customInstructions?: string
    ): Promise<void> {
        const entry: SessionLogEntry = {
            timestamp: Date.now(),
            userId,
            sessionId,
            logType: 'sessionStart',
            level: 'info',
            environment: this.environment,
            version: this.version,
            customInstructions,
        };

        await this.log(entry);
    }

    /**
     * Logs session end event.
     */
    async logSessionEnd(
        userId: string,
        sessionId: string,
        stats: { totalMessages: number; totalTools: number }
    ): Promise<void> {
        const entry: SessionLogEntry = {
            timestamp: Date.now(),
            userId,
            sessionId,
            logType: 'sessionEnd',
            level: 'info',
            environment: this.environment,
            version: this.version,
            totalMessages: stats.totalMessages,
            totalTools: stats.totalTools,
        };

        await this.log(entry);
    }

    /**
     * Core log method that writes to all configured loggers.
     */
    public async log(entry: LogEntry): Promise<void> {
        // Filter by log level
        if (this.logLevelPriority[entry.level] < this.logLevelPriority[this.minLogLevel]) {
            return; // Skip logging below minimum level
        }

        // Write to all loggers concurrently (non-blocking)
        // Use Promise.allSettled to continue even if some loggers fail
        const results = await Promise.allSettled(
            this.loggers.map(logger => logger.log(entry))
        );

        // Log any failures to Cloud Logging
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`[LoggingService] Logger ${index} failed:`, result.reason);
            }
        });
    }
}
