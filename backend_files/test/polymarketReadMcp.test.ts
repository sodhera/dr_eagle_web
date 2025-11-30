import assert from "node:assert/strict";
import { AuthService } from "../src/app/auth";
import { FixedWindowRateLimiter, InMemorySecureVault, VaultService } from "../src/app/security";
import { PolymarketReadAgent } from "../src/app/polymarketRead";
import { MarketDataAgent } from "../src/app/marketData";
import { AccessDeniedError } from "../src/core";
import { PolymarketReadClient } from "../src/adapters/polymarket/polymarketReadClient";
import { RtdsStreamClient } from "../src/adapters/polymarket/rtdsClient";
import { ClobReadClient } from "../src/adapters/polymarket/clobReadClient";
import { ClobMarketStreamClient } from "../src/adapters/polymarket/clobMarketStreamClient";
import { CryptoPriceClient } from "../src/adapters";
import { createPolymarketReadMcpServer } from "../src/mcp/polymarketRead";
import { executeMcpTool } from "../src/mcp/server";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const authService = new AuthService({
  clientId: "client",
  clientSecret: "secret",
  signingKey: "secret",
  tokenTtlSeconds: 3600,
  adminUserIds: new Set(["admin-1"]),
});

const fakePriceClient: CryptoPriceClient = {
  async getSpotPrice({ baseSymbol, quoteSymbol }) {
    return {
      baseSymbol: baseSymbol.toUpperCase(),
      quoteSymbol: quoteSymbol.toUpperCase(),
      price: 123.45,
      asOf: new Date("2025-11-26T09:30:00Z"),
      source: "test",
    };
  },
};

const baseRestClient: PolymarketReadClient = {
  async searchEntities() {
    return { markets: [{ id: "m1", question: "Q?" }], events: [], profiles: [] };
  },
  async listMarkets() {
    return [
      {
        id: "m1",
        question: "Q1?",
        closed: false,
        endDate: new Date(),
        outcomes: [
          { name: "Yes", tokenId: "t1", price: 0.5 },
          { name: "No", tokenId: "t1b", price: 0.5 },
        ],
      },
    ];
  },
  async getMarket(idOrSlug: string) {
    const outcomes =
      idOrSlug === "m2"
        ? [
            { name: "Team A", tokenId: "t2", price: 0.4 },
            { name: "Team B", tokenId: "t2b", price: 0.6 },
          ]
        : [
            { name: "Yes", tokenId: "t1", price: 0.5 },
            { name: "No", tokenId: "t1b", price: 0.5 },
          ];
    return { id: idOrSlug, question: "Q?", closed: false, endDate: new Date("2024-01-02T00:00:00Z"), outcomes };
  },
  async listEvents() {
    return [];
  },
  async getEvent() {
    return { id: "e1", title: "T", startDate: new Date(), endDate: new Date() };
  },
  async listTags() {
    return [];
  },
  async getTag() {
    return { id: "t1" };
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
  async getSeries() {
    return { id: "s1" };
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
  async getComment() {
    return { id: "c1" };
  },
  async getLiveVolume() {
    return { eventId: 1, total: 1, markets: [] };
  },
  async getOpenInterest() {
    return [{ marketId: "m1", value: 1 }];
  },
  async getTopHolders() {
    return [{ marketId: "m1", holders: [] }];
  },
  async getUserPositions() {
    return [];
  },
  async getUserTrades() {
    return [{ user: "user-1", marketId: "m1", outcome: "Yes", side: "BUY", size: 1, price: 1, timestamp: 1 }];
  },
  async getUserActivity() {
    return [{ user: "user-1", timestamp: Date.now() }];
  },
  async getTotalValuePositions() {
    return [{ user: "user-1", value: 1 }];
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

const baseStreamClient: RtdsStreamClient = {
  async streamCryptoPrices() {
    return { events: [{ symbol: "BTC", price: 1, timestamp: Date.now() }], durationMs: 10 };
  },
  async streamComments() {
    return { events: [{ commentId: "c1", body: "hi", timestamp: Date.now() }], durationMs: 10 };
  },
};

const basePriceHistories: Record<string, { timestamp: Date; price: number }[]> = {
  t1: [
    { timestamp: new Date("2024-01-01T00:00:00Z"), price: 0.4 },
    { timestamp: new Date("2024-01-02T00:00:00Z"), price: 0.9 },
  ],
  t2: [
    { timestamp: new Date("2024-01-01T00:00:00Z"), price: 0.5 },
    { timestamp: new Date("2024-01-02T00:00:00Z"), price: 0.55 },
  ],
};

const baseClobClient: ClobReadClient = {
  async getPriceHistory(params) {
    const history = basePriceHistories[params.tokenId] ?? basePriceHistories.t1;
    return { tokenId: params.tokenId, history };
  },
  async getOrderbook() {
    return { marketId: "m1", tokenId: "t1", timestamp: new Date(), bids: [], asks: [] };
  },
  async getBooks() {
    return [];
  },
  async getPrice() {
    return { tokenId: "t1", side: "BUY", price: "0.5" };
  },
  async getPrices() {
    return [{ tokenId: "t1", buy: "0.5", sell: "0.6" }];
  },
  async getMidpoint() {
    return { tokenId: "t1", midpoint: "0.55" };
  },
  async getSpreads() {
    return [{ tokenId: "t1", spread: "0.1" }];
  },
};

const baseMarketStreamClient: ClobMarketStreamClient = {
  async streamMarketChannel() {
    return { events: [], durationMs: 5 };
  },
};

const baseMarketDataAgent = new MarketDataAgent(fakePriceClient);
const baseVaultService = new VaultService(new InMemorySecureVault());

function buildServer(limitPerMinute: number) {
  const limiter = new FixedWindowRateLimiter(limitPerMinute, 60_000);
  const agent = new PolymarketReadAgent({
    restClient: baseRestClient,
    streamClient: baseStreamClient,
    clobClient: baseClobClient,
    marketStreamClient: baseMarketStreamClient,
    rateLimiter: limiter,
    limits: { publicPerMinute: limitPerMinute, userDataPerMinute: limitPerMinute, streamPerMinute: limitPerMinute },
  });

  return createPolymarketReadMcpServer({
    authService,
    agent,
    marketDataAgent: baseMarketDataAgent,
    vaultService: baseVaultService,
  });
}

test("executes search-entities and applies rate limit for non-admin", async () => {
  const server = buildServer(1);
  const { token } = authService.issueToken({ clientId: "client", clientSecret: "secret", userId: "user-1" });
  const first = await executeMcpTool(server, "search-entities", { token, query: "test" });
  assert.equal((first as any).markets[0].id, "m1");
  await assert.rejects(
    () => executeMcpTool(server, "search-entities", { token, query: "again" }),
    AccessDeniedError
  );
});

test("admins bypass rate limits", async () => {
  const server = buildServer(1);
  const { token } = authService.issueToken({
    clientId: "client",
    clientSecret: "secret",
    userId: "admin-1",
    role: "admin",
  });
  await executeMcpTool(server, "stream-crypto-prices", { token, maxEvents: 2 });
  await executeMcpTool(server, "stream-crypto-prices", { token, maxEvents: 2 });
});

test("rejects cross-user trade and activity queries for non-admins", async () => {
  const server = buildServer(5);
  const { token } = authService.issueToken({ clientId: "client", clientSecret: "secret", userId: "user-1" });
  await assert.rejects(
    () => executeMcpTool(server, "get-user-trades", { token, user: "other-user" }),
    AccessDeniedError
  );
  await assert.rejects(
    () => executeMcpTool(server, "get-user-activity", { token, user: "other-user" }),
    AccessDeniedError
  );
});

test("executes clob price tool", async () => {
  const server = buildServer(5);
  const { token } = authService.issueToken({ clientId: "client", clientSecret: "secret", userId: "user-1" });
  const price = await executeMcpTool(server, "get-price", { token, tokenId: "t1", side: "BUY" });
  assert.equal((price as any).price, "0.5");
});

test("get-market-pricing returns selected outcome by name", async () => {
  const server = buildServer(5);
  const { token } = authService.issueToken({ clientId: "client", clientSecret: "secret", userId: "user-1" });
  const result: any = await executeMcpTool(server, "get-market-pricing", {
    token,
    selection: { marketId: "m1", outcomeName: "No" },
  });
  assert.equal(result.market.id, "m1");
  assert.equal(result.outcome.name, "No");
});

test("compare-weekly-movement favors the larger mover", async () => {
  const server = buildServer(5);
  const { token } = authService.issueToken({
    clientId: "client",
    clientSecret: "secret",
    userId: "user-1",
    tier: "paid",
  });
  const result: any = await executeMcpTool(server, "compare-weekly-movement", {
    token,
    left: { marketId: "m1" },
    right: { marketId: "m2" },
  });
  assert.equal(result.dominant, "left");
});

test("get-btc-price respects caller tier for refresh hints", async () => {
  const server = buildServer(5);
  const freeToken = authService.issueToken({
    clientId: "client",
    clientSecret: "secret",
    userId: "user-1",
  }).token;
  const paidToken = authService.issueToken({
    clientId: "client",
    clientSecret: "secret",
    userId: "user-2",
    tier: "paid",
  }).token;

  const freeResult: any = await executeMcpTool(server, "get-btc-price", { token: freeToken });
  const paidResult: any = await executeMcpTool(server, "get-btc-price", { token: paidToken, quoteSymbol: "eur" });

  assert.equal(freeResult.refreshHintSeconds, 60);
  assert.equal(paidResult.quoteSymbol, "EUR");
  assert.equal(paidResult.refreshHintSeconds, 10);
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
