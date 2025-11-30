import { CryptoPriceClient, SpotPriceRequest, SpotPrice } from "../adapters/cryptoPrice";
import { AgentContext } from "./security/accessPolicy";

export class MarketDataAgent {
    private priceClient: CryptoPriceClient;

    constructor(priceClient: CryptoPriceClient) {
        this.priceClient = priceClient;
    }

    async getSpotPrice(context: AgentContext, request: SpotPriceRequest): Promise<SpotPrice> {
        // In a real app, we might check permissions in context
        return this.priceClient.getSpotPrice(request);
    }
}
