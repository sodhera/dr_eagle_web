import assert from "node:assert/strict";
import { createClobReadClient } from "../src/adapters/polymarket/clobReadClient";
import { HttpClient } from "../src/adapters/http/httpClient";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const mockHttpClient: HttpClient = {
  async get<T = unknown>(url: string | URL): Promise<any> {
    const target = url.toString();
    if (target.includes("/prices-history")) {
      return {
        status: 200,
        data: {
          history: [
            { t: 1700000000, p: 0.4 },
            { t: 1700000600, p: 0.5 },
          ],
        } as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/book")) {
      return {
        status: 200,
        data: {
          market: "m1",
          asset_id: "asset",
          timestamp: "2025-11-26T00:00:00Z",
          hash: "abc",
          bids: [{ price: "0.4", size: "10" }],
          asks: [{ price: "0.6", size: "5" }],
          min_order_size: "0.01",
          tick_size: "0.001",
          neg_risk: false,
        } as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/price")) {
      return { status: 200, data: { price: "0.55" } as T, headers: new Headers() };
    }
    if (target.includes("/midpoint")) {
      return { status: 200, data: { mid: "0.52" } as T, headers: new Headers() };
    }
    throw new Error(`Unexpected URL ${target}`);
  },
  async post<T = unknown>(url: string | URL): Promise<any> {
    const target = url.toString();
    if (target.includes("/prices")) {
      return {
        status: 200,
        data: {
          tokenA: { BUY: "0.4", SELL: "0.6" },
          tokenB: { BUY: "0.2", SELL: "0.8" },
        } as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/spreads")) {
      return {
        status: 200,
        data: { tokenA: "0.1", tokenB: "0.05" } as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/books")) {
      return {
        status: 200,
        data: [
          {
            market: "m2",
            asset_id: "tokenA",
            timestamp: "2025-11-26T01:00:00Z",
            bids: [{ price: "0.4", size: "10" }],
            asks: [{ price: "0.6", size: "5" }],
          },
        ] as T,
        headers: new Headers(),
      };
    }
    throw new Error(`Unexpected URL ${target}`);
  },
};

test("parses price history", async () => {
  const client = createClobReadClient(mockHttpClient);
  const history = await client.getPriceHistory({ tokenId: "token", interval: "1w" });
  assert.equal(history.history.length, 2);
  assert.equal(history.history[0]?.price, 0.4);
});

test("parses orderbook with metadata", async () => {
  const client = createClobReadClient(mockHttpClient);
  const book = await client.getOrderbook("token");
  assert.equal(book.bids[0]?.price, "0.4");
  assert.equal(book.asks[0]?.size, "5");
  assert.equal(book.marketId, "m1");
  assert.ok(book.timestamp instanceof Date);
  assert.equal(book.minOrderSize, "0.01");
});

test("parses price, midpoint, spreads, books, and batch prices", async () => {
  const client = createClobReadClient(mockHttpClient);
  const price = await client.getPrice("tokenA", "BUY");
  assert.equal(price.price, "0.55");
  const midpoint = await client.getMidpoint("tokenA");
  assert.equal(midpoint.midpoint, "0.52");
  const prices = await client.getPrices([{ tokenId: "tokenA" }]);
  assert.equal(prices[0]?.buy, "0.4");
  const spreads = await client.getSpreads([{ tokenId: "tokenA" }]);
  assert.equal(spreads[0]?.spread, "0.1");
  const books = await client.getBooks(["tokenA"]);
  assert.equal(books[0]?.tokenId, "tokenA");
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
