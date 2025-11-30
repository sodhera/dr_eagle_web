import { BigQuery } from '@google-cloud/bigquery';
import { Logger, LogEntry } from '../../core/logging/types';

export interface BigQueryLoggerConfig {
    projectId: string;
    datasetId: string;
    tableId: string;
}

/**
 * BigQuery logger adapter for writing structured logs.
 * Uses streaming inserts for low-latency writes.
 */
export function createBigQueryLogger(config: BigQueryLoggerConfig): Logger {
    const bigquery = new BigQuery({ projectId: config.projectId });
    const dataset = bigquery.dataset(config.datasetId);
    const table = dataset.table(config.tableId);

    return {
        async log(entry: LogEntry): Promise<void> {
            try {
                // Convert log entry to BigQuery row format
                const row = {
                    timestamp: new Date(entry.timestamp).toISOString(),
                    userId: entry.userId,
                    sessionId: entry.sessionId,
                    logType: entry.logType,
                    level: entry.level,
                    environment: entry.environment,
                    version: entry.version,
                    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
                    // Type-specific fields (will be null for other types)
                    ...flattenLogEntry(entry),
                };

                // Stream insert (low-latency, eventually consistent)
                await table.insert([row], { raw: true });
            } catch (error) {
                // Log to Cloud Logging but don't throw
                console.error('[BigQueryLogger] Failed to write log:', error);
                console.error('[BigQueryLogger] Log entry:', JSON.stringify(entry));
            }
        }
    };
}

/**
 * Flattens type-specific fields for BigQuery insertion.
 */
function flattenLogEntry(entry: LogEntry): Record<string, any> {
    switch (entry.logType) {
        case 'chat':
            return {
                chat_role: entry.role,
                chat_content: entry.content,
                chat_messageId: entry.messageId || null,
                chat_toolCalls: entry.toolCalls ? JSON.stringify(entry.toolCalls) : null,
                chat_toolCallId: entry.toolCallId || null,
            };

        case 'mcpInvocation':
            return {
                mcp_toolName: entry.toolName,
                mcp_arguments: JSON.stringify(entry.arguments),
                mcp_result: entry.result ? JSON.stringify(entry.result) : null,
                mcp_error: entry.error || null,
                mcp_durationMs: entry.durationMs,
                mcp_success: entry.success,
            };

        case 'pythonExecution':
            return {
                python_code: entry.code,
                python_inputData: entry.inputData ? JSON.stringify(entry.inputData) : null,
                python_output: entry.output || null,
                python_error: entry.error || null,
                python_durationMs: entry.durationMs,
                python_success: entry.success,
            };

        case 'agentAction':
            return {
                agent_action: entry.action,
                agent_details: entry.details ? JSON.stringify(entry.details) : null,
            };

        case 'sessionStart':
        case 'sessionEnd':
            return {
                session_customInstructions: entry.customInstructions || null,
                session_totalMessages: entry.totalMessages || null,
                session_totalTools: entry.totalTools || null,
            };

        default:
            return {};
    }
}
