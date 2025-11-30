export interface McpTool {
    handler: (args: any) => Promise<any>;
    description: string;
    inputSchema: any;
}

export interface McpServer {
    tools: Record<string, McpTool>;
}

export async function executeMcpTool(server: McpServer, toolName: string, args: any): Promise<any> {
    const tool = server.tools[toolName];
    if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
    }
    return tool.handler(args);
}
