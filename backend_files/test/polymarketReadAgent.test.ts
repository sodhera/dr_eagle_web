import assert from "node:assert/strict";
import { PolymarketReadAgent } from "../src/app/polymarketRead";
import { buildAgentContext } from "../src/app/security/accessPolicy";
import { FixedWindowRateLimiter } from "../src/app/security/rateLimiter";
import { PolymarketReadClient, GammaListMarketsParams } from "../src/adapters/polymarket/polymarketReadClient";
import { RtdsStreamClient } from "../src/adapters/polymarket/rtdsClient";
import { ClobReadClient } from "../src/adapters/polymarket/clobReadClient";
import { ClobMarketStreamClient } from "../src/adapters/polymarket/clobMarketStreamClient";
import { MarketQuote } from "../src/core";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const markets: MarketQuote[] = [
  {
    id: "high",
    question: "High volume?",
    closed: false,
    endDate: new Date("2025-12-01T00:00:00Z"),
    outcomes: [{ name: "Yes", price: 0.5 }],
    volume: 2000,
  },
  {
    id: "low",
    question: "Low volume?",
    closed: false,
    endDate: new Date("2025-12-01T00:00:00Z"),
    outcomes: [{ name: "Yes", price: 0.5 }],
    volume: 100,
  },
];

const dummyStreamClient: RtdsStreamClient = {
  async streamCryptoPrices() {
    return { events: [], durationMs: 0 };
  },
  async streamComments() {
    return { events: [], durationMs: 0 };
  },
};

const dummyClobClient: ClobReadClient = {
  async getPriceHistory(params) {
    return { tokenId: params.tokenId, history: [] };
  },
  async getOrderbook(params) {
    return { marketId: params.marketId, tokenId: params.tokenId, bids: [], asks: [], timestamp: new Date() };
  },
  async getBooks() {
    return [];
  },
  async getPrice(params) {
    return { tokenId: params.tokenId, side: params.side, price: "0" };
  },
  async getPrices(params) {
    return params.tokenIds.map((tokenId) => ({ tokenId, buy: "0", sell: "0" }));
  },
  async getMidpoint(params) {
    return { tokenId: params.tokenId, midpoint: "0" };
  },
  async getSpreads(params) {
    return params.tokenIds.map((tokenId) => ({ tokenId, spread: "0" }));
  },
};

const dummyMarketStreamClient: ClobMarketStreamClient = {
  async streamMarketChannel() {
    return { events: [], durationMs: 0 };
  },
};

test("listActiveMarketsByVolume requests Gamma ordering by 24h volume desc", async () => {
  let receivedParams: GammaListMarketsParams | undefined;
  const restClient: PolymarketReadClient = {
    async searchEntities() {
      return { markets: [], events: [], profiles: [] };
    },
    async getMarket(idOrSlug: string) {
      return { id: idOrSlug, question: "q", closed: false, endDate: new Date(), outcomes: [] };
    },
    async listMarkets(params) {
      receivedParams = params;
      return markets;
    },
    async listEvents() {
      return [];
    },
    async getEvent(idOrSlug: string) {
      return { id: idOrSlug, title: "t", startDate: new Date(), endDate: new Date() };
    },
    async listTags() {
      return [];
    },
    async getTag(idOrSlug: string) {
      return { id: idOrSlug };
    },
    async getRelatedTags() {
      return [];
    },
    async getMarketTags() {
      return [];
    },
    async listSeries() {
      return [];
    },
    async getSeries(id: string) {
      return { id };
    },
    async listTeams() {
      return [];
    },
    async getSportsMetadata() {
      return {};
    },
    async listComments() {
      return [];
    },
    async getComment(id: string) {
      return { id };
    },
    async getLiveVolume(eventId: number) {
      return { eventId, total: 0, markets: [] };
    },
    async getOpenInterest() {
      return [];
    },
    async getTopHolders() {
      return [];
    },
    async getUserPositions() {
      return [];
    },
    async getUserTrades() {
      return [];
    },
    async getUserActivity() {
      return [];
    },
    async getTotalValuePositions() {
      return [];
    },
    async getBuilderLeaderboard() {
      return [];
    },
    async getBuilderVolume() {
      return [];
    },
    async health() {
      return { gamma: true, dataApi: true };
    },
  };

  const agent = new PolymarketReadAgent({
    restClient,
    streamClient: dummyStreamClient,
    clobClient: dummyClobClient,
    marketStreamClient: dummyMarketStreamClient,
    rateLimiter: new FixedWindowRateLimiter(100, 60_000),
    limits: { publicPerMinute: 100, userDataPerMinute: 100, streamPerMinute: 100 },
  });

  const context = buildAgentContext({
    userId: "user-1",
    role: "user",
    tier: "free",
    scopes: ["polymarket:read:public"],
  });

  const result = await agent.listActiveMarketsByVolume(context, { limit: 2, offset: 1, search: "foo", tagId: 99 });

  assert.deepEqual(receivedParams, {
    limit: 2,
    offset: 1,
    search: "foo",
    tagId: 99,
    sortBy: "volume24hr",
    ascending: false,
    active: true,
    closed: false,
  });
  assert.equal(result, markets);
});

async function run(): Promise<void> {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
    } catch (error) {
      console.error(`✗ ${name}`);
      console.error(error);
      process.exitCode = 1;
      return;
    }
  }
}

void run();
