import { z } from "zod";

// --- Gamma API Schemas ---

export const MarketSchema = z.object({
    id: z.string(),
    question: z.string(),
    conditionId: z.string(),
    slug: z.string(),
    resolutionSource: z.string().optional(),
    endDate: z.string().optional(),
    creationDate: z.string().optional(),
    active: z.boolean(),
    closed: z.boolean(),
    archived: z.boolean(),
    description: z.string().optional(),
    tags: z.array(z.any()).optional(), // Detailed tag schema can be added if needed
    volume: z.string().optional(),
    volume24hr: z.string().optional(),
    clobTokenIds: z.array(z.string()).optional(),
    outcomes: z.array(z.string()).optional(),
    outcomePrices: z.array(z.string()).optional(),
    events: z.array(z.object({
        id: z.string(),
        slug: z.string(),
        title: z.string(),
        description: z.string().optional(),
        active: z.boolean(),
        closed: z.boolean(),
    })).optional(),
});

export const EventSchema = z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    active: z.boolean(),
    closed: z.boolean(),
    archived: z.boolean(),
    creationDate: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    markets: z.array(MarketSchema).optional(),
});

// --- CLOB API Schemas ---

export const OrderBookSchema = z.object({
    hash: z.string(),
    asks: z.array(z.object({ price: z.string(), size: z.string() })),
    bids: z.array(z.object({ price: z.string(), size: z.string() })),
});

export const PriceHistorySchema = z.object({
    history: z.array(z.object({
        t: z.number(), // timestamp
        p: z.number(), // price
    })),
});

// --- Data API Schemas ---

export const UserPositionSchema = z.object({
    asset: z.string(),
    title: z.string(),
    size: z.number(),
    value: z.number(),
    price: z.number(),
    initialValue: z.number(),
    cashPnl: z.number(),
});

// --- MCP Tool Input Schemas ---

export const SearchMarketsInput = z.object({
    query: z.string().describe("Keywords to search for (e.g., 'Bitcoin', 'Election')."),
    limit: z.number().optional().describe("Max results to return (default 20)."),
    offset: z.number().optional(),
    closed: z.boolean().optional(),
    active: z.boolean().optional().describe("Filter for active markets (equivalent to closed=false)."),
    order: z.string().optional(),
    ascending: z.boolean().optional(),
});

export const ListMarketsInput = z.object({
    limit: z.number().optional(),
    offset: z.number().optional(),
    closed: z.boolean().optional(),
    active: z.boolean().optional().describe("Filter for active markets (equivalent to closed=false)."),
    order: z.string().optional(),
    ascending: z.boolean().optional(),
    end_date_min: z.string().optional().describe("Minimum end date (ISO 8601 datetime)."),
    end_date_max: z.string().optional().describe("Maximum end date (ISO 8601 datetime)."),
});

export const GetMarketInput = z.object({
    identifier: z.string().describe("The Market ID (numeric string) OR the Market Slug (text string)."),
});

export const ListEventsInput = z.object({
    limit: z.number().optional(),
    offset: z.number().optional(),
    tag_slug: z.string().optional(),
    closed: z.boolean().optional(),
    active: z.boolean().optional().describe("Filter for active events (equivalent to closed=false)."),
    order: z.string().optional(),
    ascending: z.boolean().optional(),
});

export const GetEventInput = z.object({
    identifier: z.string().describe("The Event ID or Event Slug."),
});

export const GetOrderBooksInput = z.object({
    token_ids: z.array(z.string()).describe("Array of outcome token IDs to fetch books for."),
});

export const GetPricesInput = z.object({
    requests: z.array(z.object({
        token_id: z.string(),
        side: z.enum(["BUY", "SELL"]),
    })),
});

export const GetPriceHistoryInput = z.object({
    token_id: z.string(),
    interval: z.enum(["1h", "6h", "1d"]),
});

export const GetUserPositionsInput = z.object({
    user_address: z.string().describe("The user's wallet address (0x...)."),
});

export const GetUserActivityInput = z.object({
    user_address: z.string(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    activity_type: z.enum(["TRADE", "REDEEM", "ALL"]).optional(),
});

export const GetTopHoldersInput = z.object({
    token_id: z.string(),
});

export const ListCommentsInput = z.object({
    market_id: z.string(),
    limit: z.number().optional(),
    offset: z.number().optional(),
});

export const GetBuilderLeaderboardInput = z.object({
    time_period: z.enum(["DAY", "WEEK", "MONTH", "ALL"]),
});

// --- Composite Tool Input Schemas ---

export const FindTrendingMarketsInput = z.object({
    limit: z.number().optional().describe("Max results to return (default 10)."),
    category: z.string().optional().describe("Filter by category (e.g., 'Tech', 'Crypto')."),
    min_volume: z.number().optional().describe("Minimum volume threshold."),
    min_liquidity: z.number().optional().describe("Minimum liquidity threshold."),
    scan_limit: z.number().optional().describe("Number of markets to scan (default 500). Increase for complex filters."),
    fields: z.array(z.string()).optional().describe("List of fields to return (e.g., ['question', 'price'])."),
});

export const FindClosingSoonInput = z.object({
    hours: z.number().optional().describe("Markets closing within X hours (default 24)."),
    limit: z.number().optional().describe("Max results to return (default 10)."),
    category: z.string().optional().describe("Filter by category (e.g., 'Tech', 'Crypto')."),
    min_volume: z.number().optional().describe("Minimum volume threshold."),
    min_liquidity: z.number().optional().describe("Minimum liquidity threshold."),
    scan_limit: z.number().optional().describe("Number of markets to scan (default 500). Increase for complex filters."),
    fields: z.array(z.string()).optional().describe("List of fields to return (e.g., ['question', 'price'])."),
});

export const FindLongshotsInput = z.object({
    max_price: z.number().optional().describe("Max 'Yes' price (default 0.1 for <10%)."),
    min_price: z.number().optional().describe("Min 'Yes' price (default 0)."),
    limit: z.number().optional().describe("Max results to return (default 10)."),
    category: z.string().optional().describe("Filter by category (e.g., 'Tech', 'Crypto')."),
    min_volume: z.number().optional().describe("Minimum volume threshold."),
    min_liquidity: z.number().optional().describe("Minimum liquidity threshold."),
    scan_limit: z.number().optional().describe("Number of markets to scan (default 500). Increase for complex filters."),
    fields: z.array(z.string()).optional().describe("List of fields to return (e.g., ['question', 'price'])."),
});

export const FindVolatileMarketsInput = z.object({
    limit: z.number().optional().describe("Max results to return (default 10)."),
    category: z.string().optional().describe("Filter by category (e.g., 'Tech', 'Crypto')."),
    min_volume: z.number().optional().describe("Minimum volume threshold."),
    min_liquidity: z.number().optional().describe("Minimum liquidity threshold."),
    scan_limit: z.number().optional().describe("Number of markets to scan (default 500). Increase for complex filters."),
    fields: z.array(z.string()).optional().describe("List of fields to return (e.g., ['question', 'price'])."),
});
