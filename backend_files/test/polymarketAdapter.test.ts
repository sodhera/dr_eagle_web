import assert from "node:assert/strict";
import { createPolymarketClient } from "../src/adapters";
import { HttpClient } from "../src/adapters/http/httpClient";
import { MarketQuote } from "../src/core";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const mockMarketsPayload = [
  {
    id: "1",
    question: "Will it rain tomorrow?",
    slug: "rain",
    endDate: "2025-12-01T00:00:00Z",
    closed: false,
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.45","0.55"]',
    clobTokenIds: '["token-yes","token-no"]',
    oneDayPriceChange: "0.01",
    oneWeekPriceChange: "0.05",
    updatedAt: "2025-11-20T12:00:00Z",
  },
];

const mockHistoryPayload = {
  history: [
    { t: 1700000000, p: 0.4 },
    { t: 1700600000, p: 0.5 },
  ],
};

const mockHttpClient: HttpClient = {
  async get<T = unknown>(url: string | URL): Promise<any> {
    const target = url.toString();
    if (target.includes("/markets")) {
      return { status: 200, data: mockMarketsPayload as T, headers: new Headers() };
    }
    if (target.includes("/price-history") || target.includes("/prices-history")) {
      return { status: 200, data: mockHistoryPayload as T, headers: new Headers() };
    }
    throw new Error(`Unexpected URL in mock: ${target}`);
  },
  async post(): Promise<any> {
    throw new Error("not implemented");
  },
};

test("parses market listing into typed quotes with outcomes", async () => {
  const client = createPolymarketClient(mockHttpClient);
  const markets = await client.listMarkets();

  assert.equal(markets.length, 1);
  const market = markets[0] as MarketQuote;
  assert.equal(market.id, "1");
  assert.equal(market.outcomes.length, 2);
  assert.equal(market.outcomes[0].name, "Yes");
  assert.equal(market.outcomes[0].price, 0.45);
  assert.equal(market.outcomes[0].tokenId, "token-yes");
});

test("parses price history into dated points", async () => {
  const client = createPolymarketClient(mockHttpClient);
  const history = await client.getPriceHistory({ tokenId: "token-yes", interval: "1w" });

  assert.equal(history.tokenId, "token-yes");
  assert.equal(history.history.length, 2);
  assert.ok(history.history[0].timestamp instanceof Date);
  assert.equal(history.history[1].price, 0.5);
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
