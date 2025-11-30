export interface RtdsStreamClient {
    streamCryptoPrices(): Promise<{ events: any[]; durationMs: number }>;
    streamComments(): Promise<{ events: any[]; durationMs: number }>;
}
