import { HttpClient } from "../http/httpClient";

export interface ClobReadClient {
    getPriceHistory(params: { tokenId: string; interval: string }): Promise<{ tokenId: string; history: any[] }>;
    getOrderbook(tokenId: string): Promise<any>;
    getBooks(tokenIds: string[]): Promise<any[]>;
    getPrice(tokenId: string, side: string): Promise<any>;
    getPrices(requests: { tokenId: string }[]): Promise<any[]>;
    getMidpoint(tokenId: string): Promise<any>;
    getSpreads(requests: { tokenId: string }[]): Promise<any[]>;
}

export function createClobReadClient(httpClient: HttpClient): ClobReadClient {
    return {
        async getPriceHistory(params) {
            const url = `https://clob.polymarket.com/prices-history?interval=${params.interval}&market=${params.tokenId}`;
            const response = await httpClient.get<any>(url);
            return {
                tokenId: params.tokenId,
                history: response.data.history.map((h: any) => ({
                    timestamp: new Date(h.t * 1000),
                    price: h.p,
                })),
            };
        },
        async getOrderbook(tokenId) {
            const url = `https://clob.polymarket.com/book?token_id=${tokenId}`;
            const response = await httpClient.get<any>(url);
            const data = response.data;
            return {
                marketId: data.market,
                tokenId: data.asset_id,
                timestamp: new Date(data.timestamp),
                bids: data.bids,
                asks: data.asks,
                minOrderSize: data.min_order_size,
            };
        },
        async getBooks(tokenIds) {
            const url = `https://clob.polymarket.com/books`;
            const response = await httpClient.post<any[]>(url, { body: tokenIds });
            return response.data.map((b: any) => ({
                tokenId: b.asset_id,
                bids: b.bids,
                asks: b.asks,
            }));
        },
        async getPrice(tokenId, side) {
            const url = `https://clob.polymarket.com/price?token_id=${tokenId}&side=${side}`;
            const response = await httpClient.get<any>(url);
            return { tokenId, side, price: response.data.price };
        },
        async getPrices(requests) {
            const url = `https://clob.polymarket.com/prices`;
            const response = await httpClient.post<any>(url, { body: requests });
            // Response is { tokenA: { BUY: ..., SELL: ... } }
            // Map to array
            return Object.entries(response.data).map(([tokenId, prices]: [string, any]) => ({
                tokenId,
                buy: prices.BUY,
                sell: prices.SELL,
            }));
        },
        async getMidpoint(tokenId) {
            const url = `https://clob.polymarket.com/midpoint?token_id=${tokenId}`;
            const response = await httpClient.get<any>(url);
            return { tokenId, midpoint: response.data.mid };
        },
        async getSpreads(requests) {
            const url = `https://clob.polymarket.com/spreads`;
            const response = await httpClient.post<any>(url, { body: requests });
            // Response is { tokenA: spread }
            return Object.entries(response.data).map(([tokenId, spread]) => ({
                tokenId,
                spread,
            }));
        },
    };
}
