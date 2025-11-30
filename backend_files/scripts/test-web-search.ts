/**
 * Manual test script for Web Search MCP
 * Usage: npx ts-node scripts/test-web-search.ts
 */

import { WebSearchClient } from '../src/adapters/openai/webSearchClient';
import { loadConfig } from '../src/config';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config();

async function main() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('Error: OPENAI_API_KEY not found in environment');
        process.exit(1);
    }

    console.log('Initializing WebSearchClient...');
    const client = new WebSearchClient(apiKey);

    const query = 'What was a positive news story from today?';
    console.log(`\nExecuting search for: "${query}"...`);

    try {
        const response = await client.search({
            query,
            maxResults: 3,
            includeAnswers: true
        });

        console.log('\nSearch Successful!');
        console.log('------------------');
        console.log(`Provider: ${response.provider}`);
        console.log(`Responded At: ${response.respondedAt}`);

        if (response.usage) {
            console.log(`Usage: ${response.usage.promptTokens} prompt, ${response.usage.responseTokens} completion tokens`);
        }

        console.log('\n--- Text Response ---');
        console.log(response.text);

        console.log('\n--- Citations ---');
        response.citations.forEach(c => {
            console.log(`[${c.rank}] ${c.title}`);
            console.log(`    URL: ${c.url}`);
            console.log(`    Snippet: "${c.textSnippet}"`);
            console.log(`    Position: ${c.startIndex}-${c.endIndex}`);
            console.log('');
        });

    } catch (error: any) {
        console.error('\nSearch Failed!');
        console.error('-------------');
        if (error.code) {
            console.error(`Error Code: ${error.code}`);
            console.error(`Message: ${error.message}`);
            if (error.details) {
                console.error('Details:', JSON.stringify(error.details, null, 2));
            }
        } else {
            console.error(error);
        }
    }
}

main().catch(console.error);
