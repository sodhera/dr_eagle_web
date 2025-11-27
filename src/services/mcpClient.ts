import { getMcpToken } from './mcpAuth';

const MCP_BASE_URL = '/api/mcp';

interface McpToolResponse<T = any> {
    result: T;
}

export async function callMcpTool<T = any>(
    server: 'polymarketReadMcp' | 'marketDataMcp',
    tool: string,
    input: Record<string, any> = {}
): Promise<T> {
    try {
        const token = await getMcpToken();

        const response = await fetch(`${MCP_BASE_URL}/${server}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tool,
                input: {
                    token,
                    ...input,
                },
            }),
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Token might be invalid or expired, could trigger a refresh or logout here
                // For now, just throw
            }
            const errorText = await response.text();
            throw new Error(`MCP tool call failed: ${response.status} ${errorText}`);
        }

        const data: McpToolResponse<T> = await response.json();
        return data.result;
    } catch (error) {
        console.error(`Error calling MCP tool ${tool}:`, error);
        throw error;
    }
}

// Example wrapper for list-markets
export async function listMarkets(limit: number = 20) {
    return callMcpTool('polymarketReadMcp', 'list-markets', {
        limit,
        active: true,
        sortBy: 'volume',
        ascending: false,
    });
}
