import assert from "node:assert/strict";
import { HttpClient } from "../src/adapters/http/httpClient";
import { createPolymarketReadClient } from "../src/adapters";
import { MarketQuote } from "../src/core";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const mockHttpClient: HttpClient = {
  async get<T = unknown>(url: string | URL): Promise<any> {
    const target = url.toString();
    if (target.endsWith("/markets")) {
      return {
        status: 200,
        data: [
          {
            id: "m2",
            question: "Another?",
            slug: "another",
            endDate: "2025-12-15T00:00:00Z",
            startDate: "2025-11-01T00:00:00Z",
            closed: false,
            outcomes: '["Yes","No"]',
            outcomePrices: '["0.3","0.7"]',
            clobTokenIds: '["token-a","token-b"]',
            volume: "1234.5",
            liquidity: "200.1",
          },
        ] as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/public-search")) {
      return {
        status: 200,
        data: { markets: [{ id: "m1", question: "Test?", slug: "test" }], events: [], profiles: [] } as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/markets/")) {
      return {
        status: 200,
        data: {
          id: "m1",
          question: "Will it rain?",
          slug: "rain",
          endDate: "2025-12-01T00:00:00Z",
          startDate: "2025-10-01T00:00:00Z",
          closed: false,
          outcomes: '["Yes","No"]',
          outcomePrices: '["0.4","0.6"]',
          volume: 1000,
          oneDayPriceChange: "0.01",
          oneWeekPriceChange: "0.1",
          updatedAt: "2025-11-20T12:00:00Z",
          clobTokenIds: '["tok-1","tok-2"]',
        } as T,
        headers: new Headers(),
      };
    }
    if (target.endsWith("/events")) {
      return {
        status: 200,
        data: [
          {
            id: "e1",
            title: "Event title",
            startDate: "2025-11-01T00:00:00Z",
            endDate: "2025-12-01T00:00:00Z",
            volume: "50",
          },
        ] as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/events/")) {
      return {
        status: 200,
        data: {
          id: "e1",
          title: "Event title",
          startDate: "2025-11-01T00:00:00Z",
          endDate: "2025-12-01T00:00:00Z",
          volume: "50",
        } as T,
        headers: new Headers(),
      };
    }
    if (target.endsWith("/tags")) {
      return { status: 200, data: [{ id: "t1", label: "Politics" }] as T, headers: new Headers() };
    }
    if (target.includes("/tags/") && target.endsWith("/related")) {
      return { status: 200, data: [{ id: "t2", label: "US" }] as T, headers: new Headers() };
    }
    if (target.includes("/tags/") && !target.endsWith("/related")) {
      return { status: 200, data: { id: "t1", label: "Politics" } as T, headers: new Headers() };
    }
    if (target.includes("/markets/") && target.endsWith("/tags")) {
      return { status: 200, data: [{ id: "t3", label: "Weather" }] as T, headers: new Headers() };
    }
    if (target.endsWith("/series")) {
      return { status: 200, data: [{ id: "s1", title: "Series A" }] as T, headers: new Headers() };
    }
    if (target.includes("/series/")) {
      return { status: 200, data: { id: "s1", title: "Series A" } as T, headers: new Headers() };
    }
    if (target.endsWith("/teams")) {
      return { status: 200, data: [{ id: "team1", name: "Team One" }] as T, headers: new Headers() };
    }
    if (target.includes("/sports/metadata")) {
      return { status: 200, data: { sports: ["soccer"] } as T, headers: new Headers() };
    }
    if (target.includes("/comments/") && !target.endsWith("/comments/")) {
      return {
        status: 200,
        data: {
          id: "c1",
          body: "First",
          market: "m1",
          user: "u1",
          createdAt: "2025-11-26T10:00:00Z",
        } as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/comments")) {
      return {
        status: 200,
        data: [
          { id: "c1", body: "First", market: "m1", user: "u1", createdAt: "2025-11-26T10:00:00Z" },
        ] as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/live-volume")) {
      return {
        status: 200,
        data: [{ total: 123, markets: [{ market: "m1", value: 100 }] }] as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/oi")) {
      return {
        status: 200,
        data: [{ market: "m1", value: 10 }] as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/holders")) {
      return {
        status: 200,
        data: [{ token: "m1", holders: [{ proxyWallet: "0xabc", amount: "5", outcomeIndex: 1 }] }] as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/positions")) {
      return {
        status: 200,
        data: [
          {
            proxyWallet: "0xabc",
            conditionId: "cond1",
            asset: "m1",
            size: "5",
            avgPrice: "0.5",
            currentValue: "3",
            redeemable: true,
            mergeable: false,
            title: "Rain",
            slug: "rain",
            outcome: "Yes",
            outcomeIndex: 0,
          },
        ] as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/trades")) {
      return {
        status: 200,
        data: [
          {
            proxyWallet: "0xabc",
            conditionId: "cond1",
            outcome: "Yes",
            side: "BUY",
            size: "2",
            price: "0.55",
            timestamp: 1700000000,
            transactionHash: "0xhash",
          },
        ] as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/activity")) {
      return {
        status: 200,
        data: [
          {
            proxyWallet: "0xabc",
            timestamp: 1700000000,
            conditionId: "cond1",
            type: "TRADE",
            size: "2",
            usdcSize: "3",
            transactionHash: "0xhash",
            price: "0.5",
            asset: "asset1",
            side: "BUY",
            outcomeIndex: 0,
            outcome: "Yes",
            title: "Market",
            slug: "market",
            icon: "icon",
            eventSlug: "event",
            name: "Alice",
            pseudonym: "alias",
            bio: "bio",
            profileImage: "img",
            profileImageOptimized: "img-opt",
          },
        ] as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/value")) {
      return {
        status: 200,
        data: [{ user: "0xabc", value: "12.3", market: "m1" }] as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/v1/builders/leaderboard")) {
      return {
        status: 200,
        data: [{ rank: "1", builder: "builder", volume: "1000", activeUsers: 5, verified: true, builderLogo: "logo" }] as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/v1/builders/volume")) {
      return {
        status: 200,
        data: [{ dt: "2025-11-25T00:00:00Z", builder: "builder", volume: "200", activeUsers: 2, rank: "1", verified: true }] as T,
        headers: new Headers(),
      };
    }
    if (target.includes("/health")) {
      return { status: 200, data: {}, headers: new Headers() };
    }

    throw new Error(`Unexpected URL in mock: ${target}`);
  },
  async post(): Promise<any> {
    throw new Error("not implemented");
  },
};

test("searchEntities parses market results", async () => {
  const client = createPolymarketReadClient(mockHttpClient);
  const result = await client.searchEntities({ query: "rain" });
  assert.equal(result.markets.length, 1);
  assert.equal(result.markets[0]?.id, "m1");
});

test("getMarket parses outcomes, prices, and token ids", async () => {
  const client = createPolymarketReadClient(mockHttpClient);
  const market = (await client.getMarket("m1")) as MarketQuote;
  assert.equal(market.outcomes.length, 2);
  assert.equal(market.outcomes[0]?.price, 0.4);
  assert.equal(market.volume, 1000);
  assert.equal(market.outcomes[0]?.tokenId, "tok-1");
});

test("listMarkets maps volume and liquidity and token ids", async () => {
  const client = createPolymarketReadClient(mockHttpClient);
  const markets = await client.listMarkets();
  assert.equal(markets[0]?.volume, 1234.5);
  assert.equal(markets[0]?.liquidity, 200.1);
  assert.equal(markets[0]?.clobTokenIds?.[0], "token-a");
});

test("maps events, tags, series, teams, and comments", async () => {
  const client = createPolymarketReadClient(mockHttpClient);
  const events = await client.listEvents();
  assert.ok(events[0]?.startDate instanceof Date);
  const tags = await client.listTags();
  assert.equal(tags[0]?.id, "t1");
  const comment = await client.getComment("c1");
  assert.equal(comment.marketId, "m1");
  assert.ok(comment.createdAt instanceof Date);
});

test("maps live volume and open interest", async () => {
  const client = createPolymarketReadClient(mockHttpClient);
  const volume = await client.getLiveVolume(1);
  const oi = await client.getOpenInterest(["m1"]);
  assert.equal(volume.total, 123);
  assert.equal(volume.markets[0]?.marketId, "m1");
  assert.equal(oi[0]?.value, 10);
});

test("maps top holders, user positions, trades, and activity", async () => {
  const client = createPolymarketReadClient(mockHttpClient);
  const holders = await client.getTopHolders({ marketIds: ["m1"] });
  assert.equal(holders[0]?.holders[0]?.amount, 5);
  const positions = await client.getUserPositions({ user: "0xabc" });
  const trades = await client.getUserTrades({ user: "0xabc" });
  assert.equal(positions[0]?.user, "0xabc");
  assert.equal(trades[0]?.price, 0.55);
  const activity = await client.getUserActivity({ user: "0xabc" });
  assert.equal(activity[0]?.price, 0.5);
  assert.equal(activity[0]?.transactionHash, "0xhash");
});

test("maps tvl and builder analytics", async () => {
  const client = createPolymarketReadClient(mockHttpClient);
  const value = await client.getTotalValuePositions({ user: "0xabc" });
  assert.equal(value[0]?.value, 12.3);
  const leaderboard = await client.getBuilderLeaderboard();
  assert.equal(leaderboard[0]?.volume, 1000);
  const volume = await client.getBuilderVolume();
  assert.ok(volume[0]?.dt instanceof Date);
});

test("health probes gamma and data api", async () => {
  const client = createPolymarketReadClient(mockHttpClient);
  const health = await client.health();
  assert.equal(health.gamma, true);
  assert.equal(health.dataApi, true);
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
