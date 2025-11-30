import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { z } from "zod";
import { maybeHandleCorsOptions, setCors } from "./cors";
import * as polymarket from "../../src/adapters/polymarket";
import * as schemas from "../../src/core/polymarket/types";
import { DomainError } from "../../src/core";

// MCP Tool Registry
const tools = [
    {
        name: "search_markets",
        description: "Search for markets using a full-text query string.",
        inputSchema: schemas.SearchMarketsInput,
        handler: async (args: z.infer<typeof schemas.SearchMarketsInput>) => {
            const results = await polymarket.searchMarkets(args);
            return {
                content: [{ type: "text", text: `Found ${Array.isArray(results) ? results.length : 'some'} markets.` }],
                data: results,
            };
        },
    },
    {
        name: "list_markets",
        description: "Retrieve a paginated list of markets with advanced filtering.",
        inputSchema: schemas.ListMarketsInput,
        handler: async (args: z.infer<typeof schemas.ListMarketsInput>) => {
            const results = await polymarket.listMarkets(args);
            return {
                content: [{ type: "text", text: "Markets retrieved successfully." }],
                data: results,
            };
        },
    },
    {
        name: "get_market",
        description: "Retrieve full details for a specific market using its Identifier.",
        inputSchema: schemas.GetMarketInput,
        handler: async (args: z.infer<typeof schemas.GetMarketInput>) => {
            const result = await polymarket.getMarket(args.identifier);
            return {
                content: [{ type: "text", text: `Market details for ${args.identifier}` }],
                data: result,
            };
        },
    },
    {
        name: "list_events",
        description: "List events (groups of markets).",
        inputSchema: schemas.ListEventsInput,
        handler: async (args: z.infer<typeof schemas.ListEventsInput>) => {
            const results = await polymarket.listEvents(args);
            return {
                content: [{ type: "text", text: "Events retrieved successfully." }],
                data: results,
            };
        },
    },
    {
        name: "get_event",
        description: "Fetch a single event and all its contained markets.",
        inputSchema: schemas.GetEventInput,
        handler: async (args: z.infer<typeof schemas.GetEventInput>) => {
            const result = await polymarket.getEvent(args.identifier);
            return {
                content: [{ type: "text", text: `Event details for ${args.identifier}` }],
                data: result,
            };
        },
    },
    {
        name: "get_order_books",
        description: "Get the current order book (bids and asks) for one or more market tokens.",
        inputSchema: schemas.GetOrderBooksInput,
        handler: async (args: z.infer<typeof schemas.GetOrderBooksInput>) => {
            const results = await polymarket.getOrderBooks(args.token_ids);
            return {
                content: [{ type: "text", text: "Order books retrieved." }],
                data: results,
            };
        },
    },
    {
        name: "get_prices",
        description: "Get the current best Bid or Ask price for one or more tokens.",
        inputSchema: schemas.GetPricesInput,
        handler: async (args: z.infer<typeof schemas.GetPricesInput>) => {
            const results = await polymarket.getPrices(args.requests);
            return {
                content: [{ type: "text", text: "Prices retrieved." }],
                data: results,
            };
        },
    },
    {
        name: "get_price_history",
        description: "Retrieve historical price time-series data for a token.",
        inputSchema: schemas.GetPriceHistoryInput,
        handler: async (args: z.infer<typeof schemas.GetPriceHistoryInput>) => {
            const result = await polymarket.getPriceHistory(args.token_id, args.interval);
            return {
                content: [{ type: "text", text: "Price history retrieved." }],
                data: result,
            };
        },
    },
    {
        name: "get_user_positions",
        description: "Retrieve all open (active) positions for a specific user wallet.",
        inputSchema: schemas.GetUserPositionsInput,
        handler: async (args: z.infer<typeof schemas.GetUserPositionsInput>) => {
            const results = await polymarket.getUserPositions(args.user_address);
            return {
                content: [{ type: "text", text: "User positions retrieved." }],
                data: results,
            };
        },
    },
    {
        name: "get_user_activity",
        description: "Retrieve a log of a user's trade history, redemptions, and liquidity provisions.",
        inputSchema: schemas.GetUserActivityInput,
        handler: async (args: z.infer<typeof schemas.GetUserActivityInput>) => {
            const results = await polymarket.getUserActivity(args);
            return {
                content: [{ type: "text", text: "User activity retrieved." }],
                data: results,
            };
        },
    },
    {
        name: "get_top_holders",
        description: "View the top holders (largest positions) for a specific market outcome.",
        inputSchema: schemas.GetTopHoldersInput,
        handler: async (args: z.infer<typeof schemas.GetTopHoldersInput>) => {
            const results = await polymarket.getTopHolders(args.token_id);
            return {
                content: [{ type: "text", text: "Top holders retrieved." }],
                data: results,
            };
        },
    },
    {
        name: "list_comments",
        description: "List recent comments for a specific market or event.",
        inputSchema: schemas.ListCommentsInput,
        handler: async (args: z.infer<typeof schemas.ListCommentsInput>) => {
            const results = await polymarket.listComments(args);
            return {
                content: [{ type: "text", text: "Comments retrieved." }],
                data: results,
            };
        },
    },
    {
        name: "get_builder_leaderboard",
        description: "Retrieve the leaderboard of top market creators (Builders).",
        inputSchema: schemas.GetBuilderLeaderboardInput,
        handler: async (args: z.infer<typeof schemas.GetBuilderLeaderboardInput>) => {
            const results = await polymarket.getBuilderLeaderboard(args.time_period);
            return {
                content: [{ type: "text", text: "Builder leaderboard retrieved." }],
                data: results,
            };
        },
    },
    // --- Composite Tools ---
    {
        name: "find_trending_markets",
        description: "Find markets with highest 24h volume (trending).",
        inputSchema: schemas.FindTrendingMarketsInput,
        handler: async (args: z.infer<typeof schemas.FindTrendingMarketsInput>) => {
            const results = await polymarket.findTrendingMarkets(args);
            return {
                content: [{ type: "text", text: `Found ${Array.isArray(results) ? results.length : 0} trending markets.` }],
                data: results,
            };
        },
    },
    {
        name: "find_closing_soon",
        description: "Find markets closing within a specified timeframe.",
        inputSchema: schemas.FindClosingSoonInput,
        handler: async (args: z.infer<typeof schemas.FindClosingSoonInput>) => {
            const results = await polymarket.findClosingSoon(args);
            return {
                content: [{ type: "text", text: `Found ${Array.isArray(results) ? results.length : 0} markets closing soon.` }],
                data: results,
            };
        },
    },
    {
        name: "find_longshots",
        description: "Find markets with low 'Yes' price (longshot bets).",
        inputSchema: schemas.FindLongshotsInput,
        handler: async (args: z.infer<typeof schemas.FindLongshotsInput>) => {
            const results = await polymarket.findLongshots(args);
            return {
                content: [{ type: "text", text: `Found ${Array.isArray(results) ? results.length : 0} longshot markets.` }],
                data: results,
            };
        },
    },
    {
        name: "find_volatile_markets",
        description: "Find markets with highest 24h price movement (volatility).",
        inputSchema: schemas.FindVolatileMarketsInput,
        handler: async (args: z.infer<typeof schemas.FindVolatileMarketsInput>) => {
            const results = await polymarket.findVolatileMarkets(args);
            return {
                content: [{ type: "text", text: `Found ${Array.isArray(results) ? results.length : 0} volatile markets.` }],
                data: results,
            };
        },
    },
];

const toolCallSchema = z.object({
    tool: z.string(),
    input: z.record(z.unknown()),
});

function parseRequestBody(body: unknown): unknown {
    if (typeof body === "string") {
        try {
            return JSON.parse(body);
        } catch (error) {
            throw new DomainError("Invalid JSON body", { cause: error });
        }
    }
    if (body === undefined || body === null) {
        return {};
    }
    return body;
}

export const polymarketReadMcp = onRequest({ region: "us-central1" }, async (req, res) => {
    logger.info("polymarketReadMcp called", { method: req.method, path: req.path, url: req.url });

    setCors(res);
    if (maybeHandleCorsOptions(req, res)) return;

    try {
        logger.info("Processing request", { method: req.method });

        // Handle GET - list available tools
        if (req.method === "GET") {
            logger.info("Returning tools list");
            res.status(200).json({
                tools: tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    inputSchema: t.inputSchema.shape,
                })),
            });
            return;
        }

        // Handle POST - invoke a tool
        if (req.method === "POST") {
            logger.info("Handling POST request");
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).json({ error: "Unauthorized: Bearer token required" });
                return;
            }

            // TODO: Validate token against issueMcpToken logic
            // For now, we'll assume the token is valid if present

            const parsed = toolCallSchema.parse(parseRequestBody(req.body));
            const tool = tools.find((t) => t.name === parsed.tool);

            if (!tool) {
                res.status(404).json({ error: `Tool not found: ${parsed.tool}` });
                return;
            }

            const validatedInput = tool.inputSchema.parse(parsed.input);
            const result = await tool.handler(validatedInput as any);

            res.status(200).json(result);
            return;
        }

        // Unsupported method
        logger.warn("Unsupported method", { method: req.method });
        res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        logger.error("polymarketReadMcp error", { error, path: req.path, method: req.method });

        if (error instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid request", issues: error.issues });
            return;
        }

        if (error instanceof DomainError) {
            res.status(400).json({ error: error.message });
            return;
        }

        res.status(500).json({ error: "Internal server error" });
    }
});
