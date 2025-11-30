import { McpServer } from './server';
import {
    SUPPORTED_EDITIONS,
    SUPPORTED_OPERATORS,
    GoogleNewsQuerySpec,
    buildSearchQuery,
    buildFeedUrl,
    computeQueryKey,
    validateQuerySpec,
} from '../core/tracking/googleNewsRss';
import { GoogleNewsRssClient } from '../adapters/tracking/GoogleNewsRssClient';
import { createHttpClient } from '../adapters/http/httpClient';
import { normalizeGoogleNewsRss } from '../core/tracking/domain';
import { AuthService } from '../app/auth/authService';

/**
 * Google News RSS MCP Server
 * Provides tools for building, validating, and fetching Google News RSS search feeds
 */
export function createGoogleNewsRssServer(authService: AuthService): McpServer {
    const httpClient = createHttpClient();
    const rssClient = new GoogleNewsRssClient(httpClient);

    return {
        tools: {
            list_editions: {
                description: "List supported Google News editions/regions.",
                inputSchema: { type: "object", properties: {} },
                handler: async () => {
                    return {
                        editions: SUPPORTED_EDITIONS.map(e => ({
                            code: e.code,
                            gl: e.gl,
                            ceid: e.ceid,
                            description: e.description,
                        })),
                    };
                }
            },

            build_search_feed: {
                description: "Build a Google News RSS feed URL from a query specification.",
                inputSchema: {
                    type: "object",
                    properties: {
                        querySpec: { type: "object" } // TODO: Detailed schema
                    },
                    required: ["querySpec"]
                },
                handler: async (args: any) => {
                    const querySpec = args.querySpec as GoogleNewsQuerySpec;

                    // Validate query spec
                    validateQuerySpec(querySpec);

                    const renderedQuery = buildSearchQuery(querySpec);
                    const feedUrl = buildFeedUrl(querySpec);
                    const queryKey = computeQueryKey(querySpec);

                    return {
                        feedUrl,
                        renderedQuery,
                        queryKey,
                    };
                }
            },

            preview_search_feed: {
                description: "Preview items from a Google News search feed.",
                inputSchema: {
                    type: "object",
                    properties: {
                        querySpec: { type: "object" },
                        limit: { type: "number" }
                    },
                    required: ["querySpec"]
                },
                handler: async (args: any) => {
                    const { token, querySpec, limit = 10 } = args;

                    // Authenticate
                    authService.authenticate(token);

                    // Validate query spec
                    validateQuerySpec(querySpec);

                    const feedUrl = buildFeedUrl(querySpec);
                    const queryKey = computeQueryKey(querySpec);

                    // Fetch feed
                    const items = await rssClient.fetchFeed(feedUrl);

                    // Normalize items
                    const normalizedItems = items.slice(0, limit).map((item: any) => normalizeGoogleNewsRss(item));

                    return {
                        queryKey,
                        items: normalizedItems,
                        fetchedAt: Date.now(),
                    };
                }
            },

            fetch_search_feed: {
                description: "Fetch and cache a Google News search feed.",
                inputSchema: {
                    type: "object",
                    properties: {
                        queryKey: { type: "string" }
                    },
                    required: ["queryKey"]
                },
                handler: async (args: any) => {
                    const { token, queryKey } = args;

                    // Authenticate
                    authService.authenticate(token);

                    // Note: In production, this would use RssFeedCache
                    // For now, we just return a message
                    return {
                        message: 'fetch_search_feed requires querySpec for now',
                        queryKey,
                    };
                }
            },

            explain_operators: {
                description: "Explain supported search operators.",
                inputSchema: { type: "object", properties: {} },
                handler: async () => {
                    return {
                        operators: SUPPORTED_OPERATORS,
                    };
                }
            },
        },
    };
}
