/**
 * Web Search MCP Server
 * Provides general-purpose web search using OpenAI's gpt-5-nano
 */

import { McpServer } from './server';
import { WebSearchClient } from '../adapters/openai/webSearchClient';
import { WebSearchService } from '../app/search/WebSearchService';
import { AuthService } from '../app/auth/authService';
import { SearchQuery } from '../core/search/types';
import { VALIDATION_CONSTANTS } from '../core/search/validation';

export function createWebSearchServer(
    authService: AuthService,
    openaiApiKey: string
): McpServer {
    const searchClient = new WebSearchClient(openaiApiKey);
    const searchService = new WebSearchService(searchClient);

    return {
        tools: {
            search_web: {
                description: "Search the web using OpenAI's search capabilities.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string" },
                        maxResults: { type: "number" },
                        freshnessHours: { type: "number" },
                        region: { type: "string" },
                        includeAnswers: { type: "boolean" }
                    },
                    required: ["query"]
                },
                handler: async (args: any) => {
                    try {
                        const { token, query, maxResults, freshnessHours, region, includeAnswers } = args;

                        // Authenticate
                        authService.authenticate(token);

                        // Build query
                        const searchQuery: SearchQuery = {
                            query,
                            maxResults,
                            freshnessHours,
                            region,
                            includeAnswers,
                        };

                        // Execute search
                        const response = await searchService.search(searchQuery);

                        return {
                            success: true,
                            text: response.text,
                            citations: response.citations,
                            provider: response.provider,
                            respondedAt: response.respondedAt,
                            usage: response.usage,
                        };
                    } catch (error: any) {
                        console.error('[search_web] Error:', error.message, error.stack);
                        throw error; // Re-throw so OpenAIAdapter can log it properly
                    }
                }
            },

            get_search_capabilities: {
                description: "Get the capabilities and configuration of the search tool.",
                inputSchema: {
                    type: "object",
                    properties: {}
                },
                handler: async (args: any) => {
                    const { token } = args;

                    // Authenticate
                    authService.authenticate(token);

                    return {
                        model: 'gpt-5-nano',
                        maxQueryLength: VALIDATION_CONSTANTS.MAX_QUERY_LENGTH,
                        minQueryLength: VALIDATION_CONSTANTS.MIN_QUERY_LENGTH,
                        maxResults: VALIDATION_CONSTANTS.MAX_RESULTS,
                        defaultResults: VALIDATION_CONSTANTS.DEFAULT_RESULTS,
                        maxFreshnessHours: VALIDATION_CONSTANTS.MAX_FRESHNESS_HOURS,
                        defaultTimeout: VALIDATION_CONSTANTS.DEFAULT_TIMEOUT,
                    };
                }
            },
        },
    };
};
