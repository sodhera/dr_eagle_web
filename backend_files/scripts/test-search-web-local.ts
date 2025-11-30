/**
 * Test script to reproduce search_web tool execution locally
 */

import { createWebSearchServer } from '../src/mcp/web-search';
import { AuthService } from '../src/app/auth';
import { loadConfig } from '../src/config';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    console.log('Testing search_web tool locally...\n');

    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('ERROR: OPENAI_API_KEY not found in environment');
        process.exit(1);
    }
    console.log(`API Key loaded: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

    // Mock AuthService
    const mockAuthService = {
        authenticate: (token: string) => {
            console.log(`  [Auth] Authenticating token: ${token}`);
            return { claims: { userId: 'test-user', role: 'user', tier: 'free' } };
        }
    } as any as AuthService;

    // Create server
    console.log('Creating web search server...');
    const webSearchMcp = createWebSearchServer(mockAuthService, apiKey);
    console.log('Server created successfully.\n');

    // Get the search_web tool
    const searchWebTool = webSearchMcp.tools.search_web;
    if (!searchWebTool) {
        console.error('ERROR: search_web tool not found!');
        process.exit(1);
    }

    console.log('Tool found:');
    console.log(`  Name: search_web`);
    console.log(`  Description: ${searchWebTool.description}`);
    console.log(`  Schema:`, JSON.stringify(searchWebTool.inputSchema, null, 2));
    console.log('');

    // Execute the tool
    console.log('Executing search_web with test query...');
    const queryArgs = {
        query: 'current pope',
        token: 'mock-token-123'
    };

    try {
        console.log(`  Args: ${JSON.stringify(queryArgs)}\n`);
        const result = await searchWebTool.handler(queryArgs);

        console.log('SUCCESS!');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.error('FAILURE!');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        if (error.code) {
            console.error('Error Code:', error.code);
        }
        if (error.details) {
            console.error('Error Details:', JSON.stringify(error.details, null, 2));
        }
    }
}

main().catch(console.error);
