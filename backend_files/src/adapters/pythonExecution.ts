import { HttpClient } from "./http/httpClient";

export interface PythonExecutionRequest {
    code: string;
    input_data?: Record<string, any>;
}

export interface PythonExecutionResult {
    success: boolean;
    output: string;
    error: string | null;
    execution_time_ms: number;
}

export class PythonExecutionError extends Error {
    constructor(message: string, public readonly result?: PythonExecutionResult) {
        super(message);
        this.name = "PythonExecutionError";
    }
}

export interface PythonExecutionClientConfig {
    functionUrl: string;
    timeoutMs?: number;
}

export function createPythonExecutionClient(
    httpClient: HttpClient,
    config: PythonExecutionClientConfig
) {
    const timeoutMs = config.timeoutMs || 35000; // 35s (5s buffer over function timeout)

    return {
        async execute(request: PythonExecutionRequest): Promise<PythonExecutionResult> {
            try {
                const response = await httpClient.post<PythonExecutionResult>(
                    config.functionUrl,
                    {
                        body: request,
                        timeoutMs,
                    }
                );

                return response.data;
            } catch (error) {
                if (error instanceof Error) {
                    throw new PythonExecutionError(
                        `Failed to execute Python code: ${error.message}`,
                        undefined
                    );
                }
                throw error;
            }
        },
    };
}
