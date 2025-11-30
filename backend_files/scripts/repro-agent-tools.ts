
import { createWebSearchServer } from '../src/mcp/web-search';
import { AuthService } from '../src/app/auth';
import { InternalToolRegistry } from '../src/adapters/mcp/InternalToolRegistry';

// Mock AuthService
const authService = {
    authenticate: () => ({ claims: { userId: 'test-user' } })
} as any as AuthService;

async function main() {
    console.log('Testing Web Search Tool Registration...');

    // 1. Create Server
    const webSearchMcp = createWebSearchServer(authService, 'mock-api-key');

    console.log('\n--- Web Search MCP Tools ---');
    Object.entries(webSearchMcp.tools).forEach(([name, tool]) => {
        console.log(`Tool: ${name}`);
        console.log(`Description: ${tool.description}`);
        console.log(`Input Schema:`, JSON.stringify(tool.inputSchema, null, 2));
        console.log('-----------------------------------');
    });

    // 2. Simulate Agent Registration
    const toolRegistry = new InternalToolRegistry();

    console.log('\n--- Registering Tools in Registry ---');
    Object.entries(webSearchMcp.tools).forEach(([name, tool]) => {
        try {
            toolRegistry.registerTool({
                name,
                description: tool.description,
                parameters: tool.inputSchema,
                execute: async (args, context) => {
                    return tool.handler({ ...args, token: `mock_token_${context.userId}` });
                }
            });
            console.log(`Successfully registered ${name}`);
        } catch (error) {
            console.error(`Failed to register ${name}:`, error);
        }
    });

    // 3. Verify Registry
    console.log('\n--- Verifying Registry Content ---');
    const tools = toolRegistry.getTools();
    const searchTool = tools.find(t => t.name === 'search_web');

    if (searchTool) {
        console.log('Found search_web tool in registry.');
        console.log('Parameters:', JSON.stringify(searchTool.parameters, null, 2));

        if (searchTool.parameters.type === 'object' && searchTool.parameters.properties.query) {
            console.log('SUCCESS: Schema looks correct.');
        } else {
            console.error('FAILURE: Schema is missing or incorrect.');
        }
    } else {
        console.error('FAILURE: search_web tool not found in registry.');
    }
}

main().catch(console.error);
