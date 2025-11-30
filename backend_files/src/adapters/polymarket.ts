import { fetch } from "undici";
import { z } from "zod";
import * as schemas from "../core/polymarket/types";
import { HttpClient } from "../adapters/http/httpClient";
import { MarketQuote, PriceHistory } from "../core";

// Base URLs
const GAMMA_API_URL = "https://gamma-api.polymarket.com";
const CLOB_API_URL = "https://clob.polymarket.com";
const DATA_API_URL = "https://data-api.polymarket.com";

// Response filtering utilities to reduce payload size
function truncate(str: string | undefined, maxLength: number = 200): string | undefined {
    if (!str) return undefined;
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "...";
}

function filterMarket(market: any): any {
    const outcomes = typeof market.outcomes === 'string' ? JSON.parse(market.outcomes) : market.outcomes;
    const outcomePrices = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
    const clobTokenIds = typeof market.clobTokenIds === 'string' ? JSON.parse(market.clobTokenIds) : market.clobTokenIds;

    const mappedOutcomes = Array.isArray(outcomes) ? outcomes.map((name: string, index: number) => ({
        name,
        price: outcomePrices && outcomePrices[index] ? parseFloat(outcomePrices[index]) : 0,
        tokenId: clobTokenIds && clobTokenIds[index]
    })) : [];

    return {
        id: market.id,
        slug: market.slug,
        question: market.question,
        description: truncate(market.description, 150), // Truncate description
        active: market.active,
        closed: market.closed,
        endDate: market.endDate,
        volume: market.volume,
        volume24hr: market.volume24hr,
        liquidity: market.liquidity,
        outcomes: mappedOutcomes,
        lastTradePrice: market.lastTradePrice,
        oneDayPriceChange: market.oneDayPriceChange,
        category: market.category,
        // Removed image/icon to save space
        // events: market.events?.map(filterEvent), // Avoid recursive nesting if possible, or simplify
    };
}

function filterEvent(event: any): any {
    return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: truncate(event.description, 150), // Truncate description
        active: event.active,
        closed: event.closed,
        endDate: event.endDate,
        volume: event.volume,
        volume24hr: event.volume24hr,
        liquidity: event.liquidity,
        // Removed image/icon
        markets: Array.isArray(event.markets) ? event.markets.slice(0, 3).map(filterMarket) : undefined // Limit nested markets
    };
}

// Helper for HTTP requests with timeout
async function request<T>(url: string, options: RequestInit = {}, schema?: z.ZodType<T>): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const headers = new Headers(options.headers);
        headers.set("Content-Type", "application/json");
        headers.set("User-Agent", "PolymarketMCP/1.0");

        const response = await fetch(url, {
            method: options.method || "GET",
            signal: controller.signal,
            headers: headers as any,
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error("Rate limit exceeded");
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (schema) {
            return schema.parse(data);
        }
        return data as T;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error("Request timed out");
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

// --- Gamma API Methods ---

export async function searchMarkets(params: z.infer<typeof schemas.SearchMarketsInput>) {
    const url = new URL(`${GAMMA_API_URL}/public-search`);
    url.searchParams.append("q", params.query);

    // Default limit
    const limit = params.limit || 20;
    url.searchParams.append("limit_per_type", limit.toString());

    if (params.active) {
        url.searchParams.append("events_status", "active");
    } else if (params.closed) {
        url.searchParams.append("events_status", "closed");
    }

    if (params.order) {
        // Map string fields to numeric fields for correct sorting
        const orderMap: Record<string, string> = {
            "liquidity": "liquidityNum",
            "volume": "volumeNum"
        };
        url.searchParams.append("sort", orderMap[params.order] || params.order);
    }

    if (params.ascending !== undefined) {
        url.searchParams.append("ascending", params.ascending.toString());
    }

    try {
        const response = await request<any>(url.toString());

        // Filter and simplify the response structure
        return {
            events: Array.isArray(response.events) ? response.events.map(filterEvent) : [],
            // Drop tags and profiles to save space unless specifically requested
            // tags: response.tags, 
            // profiles: response.profiles
        };
    } catch (error) {
        console.warn("Public search failed, falling back to basic market listing:", error);
        // Fallback to original implementation if public-search fails
        return listMarkets({
            limit: params.limit,
            active: params.active,
            order: "volume24hr",
            ascending: false
        });
    }
}

export async function listMarkets(params: z.infer<typeof schemas.ListMarketsInput>) {
    const url = new URL(`${GAMMA_API_URL}/markets`);
    if (params.limit) url.searchParams.append("limit", params.limit.toString());
    if (params.offset) url.searchParams.append("offset", params.offset.toString());

    // Handle 'closed' or 'active' filter
    if (params.closed !== undefined) {
        url.searchParams.append("closed", params.closed.toString());
    } else if (params.active !== undefined) {
        // active=true means closed=false
        url.searchParams.append("closed", (!params.active).toString());
    }
    if (params.end_date_min) url.searchParams.append("end_date_min", params.end_date_min);
    if (params.end_date_max) url.searchParams.append("end_date_max", params.end_date_max);

    if (params.order) {
        // Map string fields to numeric fields for correct sorting
        const orderMap: Record<string, string> = {
            "liquidity": "liquidityNum",
            "volume": "volumeNum"
        };
        url.searchParams.append("order", orderMap[params.order] || params.order);
    }
    if (params.ascending !== undefined) url.searchParams.append("ascending", params.ascending.toString());

    const response = await request(url.toString());
    return Array.isArray(response) ? response.map(filterMarket) : response;
}

export async function getMarket(identifier: string) {
    // Check if identifier is numeric (ID) or string (Slug)
    const isId = /^\d+$/.test(identifier);
    const endpoint = isId ? `/markets/${identifier}` : `/markets/slug/${identifier}`;
    const market = await request(`${GAMMA_API_URL}${endpoint}`, {}, schemas.MarketSchema);
    return filterMarket(market);
}

export async function listEvents(params: z.infer<typeof schemas.ListEventsInput>) {
    const url = new URL(`${GAMMA_API_URL}/events`);
    if (params.limit) url.searchParams.append("limit", params.limit.toString());
    if (params.offset) url.searchParams.append("offset", params.offset.toString());
    if (params.tag_slug) url.searchParams.append("tag_slug", params.tag_slug);

    // Handle 'closed' or 'active' filter
    if (params.closed !== undefined) {
        url.searchParams.append("closed", params.closed.toString());
    } else if (params.active !== undefined) {
        url.searchParams.append("closed", (!params.active).toString());
    }

    if (params.order) url.searchParams.append("order", params.order);
    if (params.ascending !== undefined) url.searchParams.append("ascending", params.ascending.toString());

    const response = await request(url.toString());
    return Array.isArray(response) ? response.map(filterEvent) : response;
}

export async function getEvent(identifier: string) {
    const isId = /^\d+$/.test(identifier);
    const endpoint = isId ? `/events/${identifier}` : `/events/slug/${identifier}`;
    const event = await request(`${GAMMA_API_URL}${endpoint}`, {}, schemas.EventSchema);
    return filterEvent(event);
}

// --- CLOB API Methods ---

export async function getOrderBooks(tokenIds: string[]) {
    // This might need to be batched or called individually depending on API
    // Assuming batch endpoint or individual calls. 
    // CLOB API usually takes one token_id for orderbook.
    // If multiple, we might need Promise.all
    const promises = tokenIds.map(id =>
        request(`${CLOB_API_URL}/book?token_id=${id}`, {}, schemas.OrderBookSchema)
            .then(book => ({ token_id: id, book }))
    );
    return Promise.all(promises);
}

export async function getPrices(requests: z.infer<typeof schemas.GetPricesInput>["requests"]) {
    // CLOB price endpoint usually /price?token_id=...&side=...
    const promises = requests.map(req =>
        request(`${CLOB_API_URL}/price?token_id=${req.token_id}&side=${req.side}`)
            .then(res => ({ ...req, price: (res as any).price }))
    );
    return Promise.all(promises);
}

export async function getPriceHistory(tokenId: string, interval: string) {
    return request(`${CLOB_API_URL}/price-history?token_id=${tokenId}&interval=${interval}`, {}, schemas.PriceHistorySchema);
}

// --- Data API Methods ---

export async function getUserPositions(userAddress: string) {
    return request(`${DATA_API_URL}/positions?user=${userAddress}`);
}

export async function getUserActivity(params: z.infer<typeof schemas.GetUserActivityInput>) {
    const url = new URL(`${DATA_API_URL}/activity`);
    url.searchParams.append("user", params.user_address);
    if (params.limit) url.searchParams.append("limit", params.limit.toString());
    if (params.offset) url.searchParams.append("offset", params.offset.toString());
    if (params.activity_type) url.searchParams.append("type", params.activity_type);
    return request(url.toString());
}

export async function getTopHolders(tokenId: string) {
    return request(`${DATA_API_URL}/holders?token_id=${tokenId}`);
}

export async function listComments(params: z.infer<typeof schemas.ListCommentsInput>) {
    // Assuming comments are on Gamma or Data API. Often they are on a separate service or Gamma.
    // PolyMarketMCP.md lists it under "Social & Miscellaneous".
    // I'll assume it's on Gamma for now, but might need correction.
    const url = new URL(`${GAMMA_API_URL}/comments`);
    url.searchParams.append("market_id", params.market_id);
    if (params.limit) url.searchParams.append("limit", params.limit.toString());
    if (params.offset) url.searchParams.append("offset", params.offset.toString());
    return request(url.toString());
}

export async function getBuilderLeaderboard(timePeriod: string) {
    return request(`${DATA_API_URL}/leaderboard?window=${timePeriod}`);
}

// --- Composite Tools ---

// Shared filtering helper
function filterMarkets(markets: any[], filters: { category?: string, min_volume?: number, min_liquidity?: number }) {
    if (!Array.isArray(markets)) return [];
    return markets.filter(m => {
        // Robust Category Matching
        if (filters.category) {
            const search = filters.category.toLowerCase();
            const category = m.category ? m.category.toLowerCase() : "";
            const question = m.question ? m.question.toLowerCase() : "";
            const description = m.description ? m.description.toLowerCase() : "";
            const slug = m.slug ? m.slug.toLowerCase() : "";

            // 1. Direct match on category field
            if (category.includes(search)) return true;

            // 2. Keyword fallback for common categories
            if (search === 'crypto') {
                if (question.match(/bitcoin|btc|ethereum|eth|solana|sol|crypto|token|coin|airdrop/)) return true;
            }
            if (search === 'tech') {
                if (question.match(/ai|openai|gpt|google|apple|microsoft|tesla|spacex|meta|nvidia|tech/)) return true;
            }
            if (search === 'sports') {
                if (question.match(/nfl|nba|mlb|nhl|soccer|football|basketball|tennis|ufc|winner|champion|vs/)) return true;
            }
            if (search === 'politics') {
                if (question.match(/trump|biden|harris|election|president|senate|house|democrat|republican|vote|poll/)) return true;
            }

            // 3. Generic text search in question/slug/description
            if (question.includes(search) || slug.includes(search) || description.includes(search)) return true;

            return false;
        }

        if (filters.min_volume && (m.volume || 0) < filters.min_volume) return false;
        if (filters.min_liquidity && (m.liquidity || 0) < filters.min_liquidity) return false;
        return true;
    });
}

// Helper to project fields
function projectFields(markets: any[], fields?: string[]) {
    if (!fields || fields.length === 0) return markets;
    return markets.map(m => {
        const projected: any = {};
        fields.forEach(f => {
            if (m[f] !== undefined) projected[f] = m[f];
            // Special handling for nested outcomes if price is requested but not explicitly in fields
            if (f === 'price' && m.outcomes && m.outcomes[0]) projected.price = m.outcomes[0].price;
        });
        return projected;
    });
}

export async function findTrendingMarkets(params: z.infer<typeof schemas.FindTrendingMarketsInput>) {
    const markets = await listMarkets({
        limit: params.scan_limit || 500, // Use scan_limit or default to 500
        active: true,
        order: "volume24hr",
        ascending: false,
    });

    const filtered = filterMarkets(markets as any[], params);
    const sliced = filtered.slice(0, params.limit || 10);
    return projectFields(sliced, params.fields);
}

export async function findClosingSoon(params: z.infer<typeof schemas.FindClosingSoonInput>) {
    const hours = params.hours || 24;
    const now = new Date();
    const cutoffDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

    // Use server-side filtering with end_date_min and end_date_max
    const markets = await listMarkets({
        limit: params.scan_limit || 500, // Use scan_limit or default to 500
        active: true,
        end_date_min: now.toISOString(),
        end_date_max: cutoffDate.toISOString(),
        order: "endDate",
        ascending: true,
    });

    const filtered = filterMarkets(markets as any[], params);
    const sliced = filtered.slice(0, params.limit || 10);
    return projectFields(sliced, params.fields);
}

export async function findLongshots(params: z.infer<typeof schemas.FindLongshotsInput>) {
    const maxPrice = params.max_price || 0.1;
    const minPrice = params.min_price || 0;

    // Fetch active markets and filter by outcomePrices
    const markets = await listMarkets({
        limit: params.scan_limit || 500, // Use scan_limit or default to 500
        active: true,
        order: "volume24hr",
        ascending: false,
    });

    // 1. Apply shared filters (category, volume, liquidity) using the robust helper
    const baseFiltered = filterMarkets(markets as any[], params);

    // 2. Apply specific price filter
    const finalFiltered = baseFiltered.filter(m => {
        if (!m.outcomes || !Array.isArray(m.outcomes) || m.outcomes.length === 0) return false;
        // Check if any outcome has a price <= maxPrice
        // Usually we check the first outcome (Yes) or all outcomes depending on intent.
        // "Longshot" usually implies "Yes" is cheap.
        const yesOutcome = m.outcomes[0];
        if (!yesOutcome || typeof yesOutcome.price !== 'number') return false;
        return yesOutcome.price <= maxPrice && yesOutcome.price >= minPrice;
    });

    const sliced = finalFiltered.slice(0, params.limit || 10);
    return projectFields(sliced, params.fields);
}

export async function findVolatileMarkets(params: z.infer<typeof schemas.FindVolatileMarketsInput>) {
    // Strategy: Fetch top active markets by volume, then sort by absolute price change.
    // This ensures we find *significant* volatility in markets people care about.
    const markets = await listMarkets({
        limit: params.scan_limit || 500, // Use scan_limit or default to 500
        active: true,
        order: "volume24hr",
        ascending: false,
    });

    if (!Array.isArray(markets)) return [];

    // Filter first
    const filtered = filterMarkets(markets as any[], params);

    // Sort by absolute oneDayPriceChange descending
    const sorted = filtered.sort((a, b) => {
        const changeA = Math.abs(a.oneDayPriceChange || 0);
        const changeB = Math.abs(b.oneDayPriceChange || 0);
        return changeB - changeA;
    });

    const sliced = sorted.slice(0, params.limit || 10);
    return projectFields(sliced, params.fields);
}

export interface PolymarketClient {
    listMarkets(params?: z.infer<typeof schemas.ListMarketsInput>): Promise<MarketQuote[]>;
    getPriceHistory(params: { tokenId: string; interval: string }): Promise<PriceHistory>;
}

export function createPolymarketClient(httpClient: HttpClient): PolymarketClient {
    return {
        async listMarkets(params?: z.infer<typeof schemas.ListMarketsInput>): Promise<MarketQuote[]> {
            const url = new URL(`${GAMMA_API_URL}/markets`);
            if (params?.limit) url.searchParams.append("limit", params.limit.toString());
            if (params?.offset) url.searchParams.append("offset", params.offset.toString());
            if (params?.closed !== undefined) url.searchParams.append("closed", params.closed.toString());
            if (params?.active !== undefined) url.searchParams.append("closed", (!params.active).toString());
            if (params?.order) url.searchParams.append("order", params.order);
            if (params?.ascending !== undefined) url.searchParams.append("ascending", params.ascending.toString());

            const response = await httpClient.get<any[]>(url.toString());
            return response.data.map(filterMarket);
        },

        async getPriceHistory(params: { tokenId: string; interval: string }): Promise<PriceHistory> {
            const url = `${CLOB_API_URL}/price-history?token_id=${params.tokenId}&interval=${params.interval}`;
            const response = await httpClient.get<any>(url);
            return {
                tokenId: params.tokenId,
                history: response.data.history.map((h: any) => ({
                    timestamp: new Date(h.t * 1000),
                    price: h.p
                }))
            };
        }
    };
}
