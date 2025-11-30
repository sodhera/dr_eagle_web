import { ToolRegistry, InternalTool } from '../../core/agent/types';
import * as polymarket from '../polymarket';
import { createCryptoPriceClient } from '../cryptoPrice';
import { createPythonExecutionClient } from '../pythonExecution';
import { createHttpClient } from '../http/httpClient';

export class InternalToolRegistry implements ToolRegistry {
    private tools: Map<string, InternalTool> = new Map();

    constructor() {
        const httpClient = createHttpClient();
        const cryptoClient = createCryptoPriceClient(httpClient);
        // Assuming function URL is in env or hardcoded for now as per existing patterns
        const pythonClient = createPythonExecutionClient(httpClient, {
            functionUrl: process.env.PYTHON_EXECUTION_URL || 'https://us-central1-sodhera-search.cloudfunctions.net/execute-python-code'
        });

        this.registerTool({
            name: 'search-entities',
            description: 'Search for markets, events, and profiles on Polymarket.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string' },
                    limit: { type: 'number' }
                },
                required: ['query']
            },
            execute: async (args) => {
                return polymarket.searchMarkets({ query: args.query, limit: args.limit });
            }
        });

        this.registerTool({
            name: 'get-user-activity',
            description: 'Get activity log for a user.',
            parameters: {
                type: 'object',
                properties: {
                    user: { type: 'string' },
                    limit: { type: 'number' }
                },
                required: ['user']
            },
            execute: async (args, context) => {
                const user = args.user || context.userId; // Use arg or context user
                return polymarket.getUserActivity({ user_address: user, limit: args.limit });
            }
        });

        this.registerTool({
            name: 'get-price',
            description: 'Get current price for a market or outcome.',
            parameters: {
                type: 'object',
                properties: {
                    marketId: { type: 'string' } // Changed from token to marketId for clarity with getMarket
                },
                required: ['marketId']
            },
            execute: async (args) => {
                return polymarket.getMarket(args.marketId);
            }
        });

        this.registerTool({
            name: 'get-btc-price',
            description: 'Get current Bitcoin spot price.',
            parameters: {
                type: 'object',
                properties: {
                    quoteSymbol: { type: 'string' }
                }
            },
            execute: async (args) => {
                return cryptoClient.getSpotPrice({
                    baseSymbol: 'BTC',
                    quoteSymbol: args.quoteSymbol || 'USD'
                });
            }
        });

        this.registerTool({
            name: 'execute-python-code',
            description: 'Execute arbitrary Python code in a secure, sandboxed environment.',
            parameters: {
                type: 'object',
                properties: {
                    code: { type: 'string' },
                    input_data: { type: 'object' }
                },
                required: ['code']
            },
            execute: async (args) => {
                return pythonClient.execute({
                    code: args.code,
                    input_data: args.input_data
                });
            }
        });

        this.registerTool({
            name: 'list-markets',
            description: "List individual markets with filtering and sorting. Use this for specific contracts (e.g. 'Will X happen?'). IMPORTANT: For broad 'top', 'trending', or 'popular' queries, prefer using 'list-events' instead, as it returns aggregated market groups (like 'Super Bowl Winner') which are usually what users mean.",
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'number' },
                    offset: { type: 'number' },
                    order: { type: 'string', description: 'Field to sort by (e.g. volume24hr, liquidity, createdAt)' },
                    ascending: { type: 'boolean', description: 'Sort order. Default is true (ascending). Set to false for descending (largest first).' },
                    active: { type: 'boolean' },
                    closed: { type: 'boolean' }
                }
            },
            execute: async (args) => {
                return polymarket.listMarkets(args);
            }
        });

        this.registerTool({
            name: 'list-events',
            description: 'List events with filtering and sorting options. Use this to find top events by volume, date, etc. Valid order fields: volume, startDate, endDate, liquidity. IMPORTANT: Default sort is ASCENDING. Set ascending: false for "largest", "top", or "most" queries.',
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'number' },
                    offset: { type: 'number' },
                    order: { type: 'string', description: 'Field to sort by (e.g. volume, startDate, endDate)' },
                    ascending: { type: 'boolean', description: 'Sort order. Default is true (ascending). Set to false for descending (largest first).' },
                    active: { type: 'boolean' },
                    closed: { type: 'boolean' },
                    tag_slug: { type: 'string' }
                }
            },
            execute: async (args) => {
                return polymarket.listEvents(args);
            }
        });

        this.registerTool({
            name: 'get-event',
            description: 'Get details for a specific event by ID or slug.',
            parameters: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                },
                required: ['id']
            },
            execute: async (args) => {
                return polymarket.getEvent(args.id);
            }
        });

        this.registerTool({
            name: 'get-market',
            description: 'Get details for a specific market by ID or slug.',
            parameters: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                },
                required: ['id']
            },
            execute: async (args) => {
                return polymarket.getMarket(args.id);
            }
        });

        this.registerTool({
            name: 'find-trending',
            description: `Find trending markets based on 24h volume.
COMPLEXITY RULE: For simple queries, use default scan_limit. For complex filters (e.g. specific category + high volume), set scan_limit to 100-500. If no results found, retry with higher scan_limit.
OUTPUT RULE: Use "fields" to specify needed data. Available fields: id, slug, question, description, category, active, closed, endDate, volume, volume24hr, liquidity, outcomes (array with name/price), lastTradePrice, oneDayPriceChange.
Example: fields: ["question", "volume24hr", "outcomes"] for lean output.`,
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'number' },
                    category: { type: 'string', description: 'Filter by category (e.g., "Tech", "Crypto")' },
                    min_volume: { type: 'number', description: 'Minimum volume threshold' },
                    min_liquidity: { type: 'number', description: 'Minimum liquidity threshold' },
                    scan_limit: { type: 'number', description: 'Markets to scan (default 500). Increase for complex queries.' },
                    fields: { type: 'array', items: { type: 'string' }, description: 'Fields to return. Available: id, slug, question, description, category, active, closed, endDate, volume, volume24hr, liquidity, outcomes, lastTradePrice, oneDayPriceChange, price (computed from outcomes[0].price)' }
                }
            },
            execute: async (args) => {
                return polymarket.findTrendingMarkets(args);
            }
        });

        this.registerTool({
            name: 'find-closing-soon',
            description: `Find active markets that are closing soon (default within 24h).
COMPLEXITY RULE: For simple queries, use default scan_limit. For complex filters, set scan_limit to 100-500.
OUTPUT RULE: Use "fields" to specify needed data. Available fields: id, slug, question, description, category, active, closed, endDate, volume, volume24hr, liquidity, outcomes, lastTradePrice, oneDayPriceChange.`,
            parameters: {
                type: 'object',
                properties: {
                    hours: { type: 'number', description: 'Hours until close (default 24)' },
                    limit: { type: 'number' },
                    category: { type: 'string', description: 'Filter by category (e.g., "Tech", "Crypto")' },
                    min_volume: { type: 'number', description: 'Minimum volume threshold' },
                    min_liquidity: { type: 'number', description: 'Minimum liquidity threshold' },
                    scan_limit: { type: 'number', description: 'Markets to scan (default 500). Increase for complex queries.' },
                    fields: { type: 'array', items: { type: 'string' }, description: 'Fields to return. Available: id, slug, question, description, category, active, closed, endDate, volume, volume24hr, liquidity, outcomes, lastTradePrice, oneDayPriceChange, price' }
                }
            },
            execute: async (args) => {
                return polymarket.findClosingSoon(args);
            }
        });

        this.registerTool({
            name: 'find-longshots',
            description: `Find active markets with low probability outcomes (longshots).
COMPLEXITY RULE: For simple queries, use default scan_limit. For complex filters (e.g. Tech + Longshot), set scan_limit to 500.
OUTPUT RULE: Use "fields" to specify needed data. Available fields: id, slug, question, description, category, active, closed, endDate, volume, volume24hr, liquidity, outcomes, lastTradePrice, oneDayPriceChange.`,
            parameters: {
                type: 'object',
                properties: {
                    max_price: { type: 'number', description: 'Maximum price for the outcome (default 0.10)' },
                    min_price: { type: 'number', description: 'Minimum price for the outcome (default 0)' },
                    limit: { type: 'number' },
                    category: { type: 'string', description: 'Filter by category (e.g., "Tech", "Crypto")' },
                    min_volume: { type: 'number', description: 'Minimum volume threshold' },
                    min_liquidity: { type: 'number', description: 'Minimum liquidity threshold' },
                    scan_limit: { type: 'number', description: 'Markets to scan (default 500). Increase for complex queries.' },
                    fields: { type: 'array', items: { type: 'string' }, description: 'Fields to return. Available: id, slug, question, description, category, active, closed, endDate, volume, volume24hr, liquidity, outcomes, lastTradePrice, oneDayPriceChange, price' }
                }
            },
            execute: async (args) => {
                return polymarket.findLongshots(args);
            }
        });

        this.registerTool({
            name: 'find-volatile',
            description: `Find markets with high price volatility in the last 24h.
COMPLEXITY RULE: For simple queries, use default scan_limit. For complex filters, set scan_limit to 100-500.
OUTPUT RULE: Use "fields" to specify needed data. Available fields: id, slug, question, description, category, active, closed, endDate, volume, volume24hr, liquidity, outcomes, lastTradePrice, oneDayPriceChange.`,
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'number' },
                    category: { type: 'string', description: 'Filter by category (e.g., "Tech", "Crypto")' },
                    min_volume: { type: 'number', description: 'Minimum volume threshold' },
                    min_liquidity: { type: 'number', description: 'Minimum liquidity threshold' },
                    scan_limit: { type: 'number', description: 'Markets to scan (default 500). Increase for complex queries.' },
                    fields: { type: 'array', items: { type: 'string' }, description: 'Fields to return. Available: id, slug, question, description, category, active, closed, endDate, volume, volume24hr, liquidity, outcomes, lastTradePrice, oneDayPriceChange, price' }
                }
            },
            execute: async (args) => {
                return polymarket.findVolatileMarkets(args);
            }
        });

        this.registerTool({
            name: 'get-open-interest',
            description: 'Get open interest for a market.',
            parameters: {
                type: 'object',
                properties: {
                    marketId: { type: 'string' }
                },
                required: ['marketId']
            },
            execute: async (args) => {
                const market = await polymarket.getMarket(args.marketId);
                return {
                    marketId: market.id,
                    openInterest: market.openInterest || 0,
                    volume: market.volume || 0,
                    liquidity: market.liquidity || 0
                };
            }
        });

    }

    public registerTool(tool: InternalTool) {
        this.tools.set(tool.name, tool);
    }

    getTool(name: string): InternalTool | undefined {
        return this.tools.get(name);
    }

    getTools(): InternalTool[] {
        return Array.from(this.tools.values());
    }
}
