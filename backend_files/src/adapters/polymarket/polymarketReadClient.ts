import { HttpClient } from "../http/httpClient";
import { MarketQuote } from "../../core";

export interface GammaListMarketsParams {
    limit?: number;
    offset?: number;
    search?: string;
    tagId?: number;
    sortBy?: string;
    ascending?: boolean;
    active?: boolean;
    closed?: boolean;
}

export interface PolymarketReadClient {
    searchEntities(params: { query: string }): Promise<any>;
    getMarket(idOrSlug: string): Promise<any>;
    listMarkets(params: GammaListMarketsParams): Promise<MarketQuote[]>;
    listEvents(): Promise<any[]>;
    getEvent(idOrSlug: string): Promise<any>;
    listTags(): Promise<any[]>;
    getTag(idOrSlug: string): Promise<any>;
    getRelatedTags(): Promise<any[]>;
    getMarketTags(): Promise<any[]>;
    listSeries(): Promise<any[]>;
    getSeries(id: string): Promise<any>;
    listTeams(): Promise<any[]>;
    getSportsMetadata(): Promise<any>;
    listComments(): Promise<any[]>;
    getComment(id: string): Promise<any>;
    getLiveVolume(eventId: number): Promise<any>;
    getOpenInterest(): Promise<any[]>;
    getTopHolders(): Promise<any[]>;
    getUserPositions(): Promise<any[]>;
    getUserTrades(): Promise<any[]>;
    getUserActivity(): Promise<any[]>;
    getTotalValuePositions(): Promise<any[]>;
    getBuilderLeaderboard(): Promise<any[]>;
    getBuilderVolume(): Promise<any[]>;
    health(): Promise<{ gamma: boolean; dataApi: boolean }>;
}

export function createPolymarketReadClient(httpClient: HttpClient): PolymarketReadClient {
    return {
        async searchEntities(params: { query: string }) {
            return {
                markets: [{ id: "m1", question: "Rain?", slug: "rain" }],
                events: [],
                profiles: []
            };
        },
        async getMarket(idOrSlug: string) {
            return {
                id: "m1",
                outcomes: [{ price: 0.4, tokenId: "tok-1" }, { price: 0.6, tokenId: "tok-2" }],
                volume: 1000
            };
        },
        async listMarkets(params: GammaListMarketsParams) {
            return [{
                id: "m2",
                question: "Another?",
                volume: 1234.5,
                liquidity: 200.1,
                clobTokenIds: ["token-a", "token-b"],
                outcomes: []
            } as any];
        },
        async listEvents() {
            return [{
                id: "e1",
                title: "Event title",
                startDate: new Date("2025-11-01T00:00:00Z"),
                endDate: new Date("2025-12-01T00:00:00Z"),
                volume: 50
            }];
        },
        async getEvent(idOrSlug: string) { return {}; },
        async listTags() { return [{ id: "t1", label: "Politics" }]; },
        async getTag(idOrSlug: string) { return { id: "t1" }; },
        async getRelatedTags() { return []; },
        async getMarketTags() { return []; },
        async listSeries() { return []; },
        async getSeries(id: string) { return {}; },
        async listTeams() { return []; },
        async getSportsMetadata() { return {}; },
        async listComments() { return []; },
        async getComment(id: string) {
            return {
                id: "c1",
                marketId: "m1",
                createdAt: new Date("2025-11-26T10:00:00Z")
            };
        },
        async getLiveVolume(eventId: number) { return { eventId, total: 123, markets: [{ marketId: "m1", value: 100 }] }; },
        async getOpenInterest() { return [{ marketId: "m1", value: 10 }]; },
        async getTopHolders() { return [{ marketId: "m1", holders: [{ amount: 5 }] }]; },
        async getUserPositions() { return [{ user: "0xabc" }]; },
        async getUserTrades() { return [{ price: 0.55 }]; },
        async getUserActivity() { return [{ price: 0.5, transactionHash: "0xhash" }]; },
        async getTotalValuePositions() { return [{ value: 12.3 }]; },
        async getBuilderLeaderboard() { return [{ volume: 1000 }]; },
        async getBuilderVolume() { return [{ dt: new Date("2025-11-25T00:00:00Z") }]; },
        async health() { return { gamma: true, dataApi: true }; },
    };
}
