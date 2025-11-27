import { ChatCompletionTool } from "openai/resources/chat/completions";

export const tools: ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "list_markets",
            description: "List markets from Polymarket with various filters. Use sortBy='volume' and ascending=false to get highest volume markets. Set active=true to only get currently active markets.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number", description: "Number of markets to return (default 20)" },
                    offset: { type: "number", description: "Offset for pagination" },
                    active: { type: "boolean", description: "Filter by active markets (true = only active, false = only closed)" },
                    closed: { type: "boolean", description: "Filter by closed markets" },
                    category: { type: "string", description: "Filter by category" },
                    search: { type: "string", description: "Search query" },
                    tagId: { type: "number", description: "Filter by tag ID" },
                    sortBy: { type: "string", description: "Sort field. Use 'volume' for highest traded volume, 'liquidity' for most liquid markets" },
                    ascending: { type: "boolean", description: "Sort order: false for descending (highest first), true for ascending (lowest first)" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "list_active_markets_by_volume",
            description: "Show top active markets pre-sorted by total traded volume (descending). This is a convenience wrapper - for more control over sorting, use list_markets instead.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number", description: "Number of markets to return" },
                    offset: { type: "number", description: "Offset for pagination" },
                    category: { type: "string", description: "Filter by category" },
                    search: { type: "string", description: "Search query" },
                    tagId: { type: "number", description: "Filter by tag ID" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_market",
            description: "Get details for a specific market by ID or slug.",
            parameters: {
                type: "object",
                properties: {
                    id: { type: "string", description: "The ID or slug of the market to retrieve." },
                },
                required: ["id"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "search_entities",
            description: "Search markets, events, or profiles.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "The search query." },
                    types: {
                        type: "array",
                        items: { type: "string", enum: ["markets", "events", "profiles"] },
                        description: "Types of entities to search for"
                    },
                    limit: { type: "number", description: "Number of results to return" },
                },
                required: ["query"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_market_pricing",
            description: "Get current pricing for a specific outcome.",
            parameters: {
                type: "object",
                properties: {
                    selection: {
                        type: "object",
                        properties: {
                            marketId: { type: "string", description: "The market ID" },
                            outcomeIndex: { type: "number", description: "Index of the outcome" },
                            outcomeName: { type: "string", description: "Name of the outcome" },
                        },
                        required: ["marketId"],
                    },
                },
                required: ["selection"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "compare_weekly_movement",
            description: "Compare which of two outcomes moved more over the last week.",
            parameters: {
                type: "object",
                properties: {
                    left: {
                        type: "object",
                        properties: {
                            marketId: { type: "string" },
                            outcomeIndex: { type: "number" },
                            outcomeName: { type: "string" },
                        },
                        required: ["marketId"],
                    },
                    right: {
                        type: "object",
                        properties: {
                            marketId: { type: "string" },
                            outcomeIndex: { type: "number" },
                            outcomeName: { type: "string" },
                        },
                        required: ["marketId"],
                    },
                },
                required: ["left", "right"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_btc_price",
            description: "Get the current BTC price.",
            parameters: {
                type: "object",
                properties: {
                    quoteSymbol: { type: "string", description: "Quote symbol (default USD)" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_user_positions",
            description: "Get the user's positions.",
            parameters: {
                type: "object",
                properties: {
                    user: { type: "string", description: "Optional user ID (admins only)" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_user_trades",
            description: "Get the user's recent trades.",
            parameters: {
                type: "object",
                properties: {
                    user: { type: "string", description: "Optional user ID (admins only)" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_total_value_of_positions",
            description: "Get the total value of user's positions.",
            parameters: {
                type: "object",
                properties: {
                    user: { type: "string", description: "Optional user ID (admins only)" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_live_volume",
            description: "Get live trading volume for an event.",
            parameters: {
                type: "object",
                properties: {
                    eventId: { type: "number", description: "The event ID" },
                },
                required: ["eventId"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_open_interest",
            description: "Get open interest for markets (money currently at stake).",
            parameters: {
                type: "object",
                properties: {
                    marketIds: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of market IDs"
                    },
                },
                required: ["marketIds"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_market_volume",
            description: "Get total traded volume for a market.",
            parameters: {
                type: "object",
                properties: {
                    marketIdOrSlug: { type: "string", description: "Market ID or slug" },
                },
                required: ["marketIdOrSlug"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "list_events",
            description: "List events from Polymarket.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number", description: "Number of events to return" },
                    offset: { type: "number", description: "Offset for pagination" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_event",
            description: "Get details for a specific event.",
            parameters: {
                type: "object",
                properties: {
                    eventId: { type: "number", description: "The event ID" },
                },
                required: ["eventId"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_price_history",
            description: "Get price history chart data for a token over time.",
            parameters: {
                type: "object",
                properties: {
                    tokenId: { type: "string", description: "The token ID" },
                    interval: {
                        type: "string",
                        enum: ["1m", "1h", "6h", "1d", "1w", "max"],
                        description: "Time interval"
                    },
                    startTs: { type: "number", description: "Start timestamp (optional)" },
                    endTs: { type: "number", description: "End timestamp (optional)" },
                },
                required: ["tokenId"],
            },
        },
    },
];
