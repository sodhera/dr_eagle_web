import { HttpClient } from "./http/httpClient";

export interface SpotPrice {
    baseSymbol: string;
    quoteSymbol: string;
    price: number;
    asOf: Date;
    source: string;
}

export interface SpotPriceRequest {
    baseSymbol: string;
    quoteSymbol: string;
}

export interface CryptoPriceClient {
    getSpotPrice(request: SpotPriceRequest): Promise<SpotPrice>;
}

export class MarketDataClientError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MarketDataClientError";
    }
}

export function createCryptoPriceClient(httpClient: HttpClient): CryptoPriceClient {
    return {
        async getSpotPrice(request: SpotPriceRequest): Promise<SpotPrice> {
            const url = `https://api.coinbase.com/v2/prices/${request.baseSymbol}-${request.quoteSymbol}/spot`;

            try {
                const response = await httpClient.get<any>(url);
                const data = response.data.data;

                if (!data || !data.amount || isNaN(parseFloat(data.amount))) {
                    throw new Error("Invalid response format");
                }

                const asOfHeader = response.headers.get("last-modified");
                const asOf = asOfHeader ? new Date(asOfHeader) : new Date();

                return {
                    baseSymbol: data.base,
                    quoteSymbol: data.currency,
                    price: parseFloat(data.amount),
                    asOf,
                    source: "coinbase",
                };
            } catch (error) {
                throw new MarketDataClientError(`Failed to fetch spot price: ${error}`);
            }
        },
    };
}
