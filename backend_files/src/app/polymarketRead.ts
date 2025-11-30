import { PolymarketReadClient, GammaListMarketsParams } from "../adapters/polymarket/polymarketReadClient";
import { RtdsStreamClient } from "../adapters/polymarket/rtdsClient";
import { ClobReadClient } from "../adapters/polymarket/clobReadClient";
import { ClobMarketStreamClient } from "../adapters/polymarket/clobMarketStreamClient";
import { RateLimiter } from "./security/rateLimiter";
import { AgentContext } from "./security/accessPolicy";
import { MarketQuote } from "../core";

export interface PolymarketReadAgentConfig {
    restClient: PolymarketReadClient;
    streamClient: RtdsStreamClient;
    clobClient: ClobReadClient;
    marketStreamClient: ClobMarketStreamClient;
    rateLimiter: RateLimiter;
    limits: {
        publicPerMinute: number;
        userDataPerMinute: number;
        streamPerMinute: number;
    };
}

export class PolymarketReadAgent {
    private restClient: PolymarketReadClient;
    private config: PolymarketReadAgentConfig;

    constructor(config: PolymarketReadAgentConfig) {
        this.restClient = config.restClient;
        this.config = config;
    }

    async searchEntities(context: AgentContext, query: string): Promise<any> {
        this.config.rateLimiter.consume(context.claims, "search-entities", this.config.limits.publicPerMinute);
        return this.restClient.searchEntities({ query });
    }

    async listActiveMarketsByVolume(
        context: AgentContext,
        params: { limit?: number; offset?: number; search?: string; tagId?: number }
    ): Promise<MarketQuote[]> {
        this.config.rateLimiter.consume(context.claims, "list-markets", this.config.limits.publicPerMinute);

        // Basic implementation to pass the test
        const query: GammaListMarketsParams = {
            limit: params.limit,
            offset: params.offset,
            search: params.search,
            tagId: params.tagId,
            sortBy: "volume24hr",
            ascending: false,
            active: true,
            closed: false,
        };

        return this.restClient.listMarkets(query);
    }
}
