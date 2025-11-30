import assert from "node:assert/strict";
import { createCryptoPriceClient, MarketDataClientError } from "../src/adapters";
import { HttpClient } from "../src/adapters/http/httpClient";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const mockHeaders = new Headers({
  "last-modified": "Wed, 26 Nov 2025 09:00:00 GMT",
});

const spotPayload = {
  data: {
    base: "BTC",
    currency: "USD",
    amount: "42000.15",
  },
};

const mockHttpClient: HttpClient = {
  async get<T = unknown>(url: string | URL): Promise<any> {
    const target = url.toString();
    if (!target.includes("/spot")) {
      throw new Error(`Unexpected URL: ${target}`);
    }
    return { status: 200, data: spotPayload as T, headers: mockHeaders };
  },
  async post(): Promise<any> {
    throw new Error("not implemented");
  },
};

test("parses Coinbase spot price into typed quote with timestamp", async () => {
  const client = createCryptoPriceClient(mockHttpClient);
  const quote = await client.getSpotPrice({ baseSymbol: "btc", quoteSymbol: "usd" });

  assert.equal(quote.baseSymbol, "BTC");
  assert.equal(quote.quoteSymbol, "USD");
  assert.equal(quote.price, 42000.15);
  assert.equal(quote.asOf.toISOString(), new Date("2025-11-26T09:00:00.000Z").toISOString());
  assert.equal(quote.source, "coinbase");
});

test("rejects invalid amount payloads", async () => {
  const failingClient: HttpClient = {
    async get<T = unknown>(): Promise<any> {
      return {
        status: 200,
        data: { data: { base: "BTC", currency: "USD", amount: "not-a-number" } } as T,
        headers: new Headers(),
      };
    },
    async post(): Promise<any> {
      throw new Error("not implemented");
    },
  };

  const client = createCryptoPriceClient(failingClient);
  await assert.rejects(() => client.getSpotPrice({ baseSymbol: "BTC", quoteSymbol: "USD" }), MarketDataClientError);
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
