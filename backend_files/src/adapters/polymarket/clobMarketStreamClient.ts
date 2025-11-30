export interface ClobMarketStreamClient {
    streamMarketChannel(): Promise<{ events: any[]; durationMs: number }>;
}
