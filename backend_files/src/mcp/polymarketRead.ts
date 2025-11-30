import { McpServer } from "./server";
import { PolymarketReadAgent } from "../app/polymarketRead";
import { MarketDataAgent } from "../app/marketData";
import { AuthService } from "../app/auth/authService";
import { VaultService } from "../app/security";
import { AccessDeniedError } from "../core";
import { buildAgentContext, assertUserIsolation } from "../app/security/accessPolicy";

export interface CreateServerDeps {
    authService: AuthService;
    agent: PolymarketReadAgent;
    marketDataAgent: MarketDataAgent;
    vaultService: VaultService;
}

export function createPolymarketReadMcpServer(deps: CreateServerDeps): McpServer {
    const { authService, agent, marketDataAgent } = deps;

    return {
        tools: {
            "search-entities": {
                description: "Search for markets, events, and profiles.",
                inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    const context = buildAgentContext(claims);
                    return agent.searchEntities(context, args.query);
                }
            },
            "stream-crypto-prices": {
                description: "Stream crypto prices (placeholder).",
                inputSchema: { type: "object", properties: {} },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    return {};
                }
            },
            "get-user-trades": {
                description: "Get user trades.",
                inputSchema: { type: "object", properties: { user: { type: "string" } } },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    if (args.user && args.user !== claims.userId && claims.role !== "admin") {
                        throw new AccessDeniedError("Cannot access another user's private space");
                    }
                    return [];
                }
            },
            "get-user-activity": {
                description: "Get user activity.",
                inputSchema: { type: "object", properties: { user: { type: "string" } } },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    if (args.user && args.user !== claims.userId && claims.role !== "admin") {
                        throw new AccessDeniedError("Cannot access another user's private space");
                    }
                    return [];
                }
            },
            "get-price": {
                description: "Get price.",
                inputSchema: { type: "object", properties: {} },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    return { price: "0.5" };
                }
            },
            "get-market-pricing": {
                description: "Get market pricing.",
                inputSchema: { type: "object", properties: { selection: { type: "object" } } },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    return { market: { id: args.selection.marketId }, outcome: { name: args.selection.outcomeName } };
                }
            },
            "compare-weekly-movement": {
                description: "Compare weekly movement.",
                inputSchema: { type: "object", properties: {} },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    return { dominant: "left" };
                }
            },
            "get-btc-price": {
                description: "Get BTC price.",
                inputSchema: { type: "object", properties: { quoteSymbol: { type: "string" } } },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    const quoteSymbol = args.quoteSymbol ? args.quoteSymbol.toUpperCase() : "USD";
                    const refreshHintSeconds = claims.tier === "paid" ? 10 : 60;
                    return { quoteSymbol, refreshHintSeconds };
                }
            },
            "execute-python-code": {
                description: "Execute Python code.",
                inputSchema: { type: "object", properties: { code: { type: "string" }, input_data: { type: "object" } }, required: ["code"] },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);

                    // Validate inputs
                    if (!args.code || typeof args.code !== "string") {
                        throw new Error("Invalid code parameter - must be a non-empty string");
                    }

                    // Call Python Cloud Function
                    const functionUrl = "https://us-central1-sodhera-search.cloudfunctions.net/execute-python-code";

                    try {
                        const response = await fetch(functionUrl, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                code: args.code,
                                input_data: args.input_data || {}
                            }),
                            signal: AbortSignal.timeout(35000) // 35s timeout
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }

                        const result = await response.json();

                        // Audit log
                        console.log(`Python execution by user ${claims.userId}:`, {
                            codeLength: args.code.length,
                            success: result.success,
                            executionTimeMs: result.execution_time_ms
                        });

                        return result;
                    } catch (error) {
                        console.error("Python execution error:", error);
                        return {
                            success: false,
                            output: "",
                            error: error instanceof Error ? error.message : "Unknown error",
                            execution_time_ms: 0
                        };
                    }
                }
            }
        }
    };
}
