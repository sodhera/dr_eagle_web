import { HttpClient } from '../http/httpClient';
import { TrackerTarget } from '../../core/tracking/types';
import { GoogleNewsRssClient } from './GoogleNewsRssClient';
import { buildFeedUrl } from '../../core/tracking/googleNewsRss';

export class TrackingDataFetcher {
    private googleNewsRssClient: GoogleNewsRssClient;

    constructor(private httpClient: HttpClient) {
        this.googleNewsRssClient = new GoogleNewsRssClient(httpClient);
    }

    async fetch(target: TrackerTarget): Promise<any[]> {
        switch (target.type) {
            case 'polymarketMarket':
                return this.fetchPolymarketMarket(target.marketId);
            case 'polymarketEvent':
                return this.fetchPolymarketEvent(target.eventId);
            case 'httpSource':
                return this.fetchHttpSource(target.url);
            case 'googleNewsRssSearch':
                const feedUrl = buildFeedUrl(target.querySpec);
                return await this.googleNewsRssClient.fetchFeed(feedUrl);
            case 'substackFeed':
                // TODO: Implement RSS parsing
                return [];
            case 'composite':
                // Composite trackers don't fetch external data directly
                return [];
            default:
                throw new Error(`Unsupported target type: ${(target as any).type}`);
        }
    }

    private async fetchPolymarketMarket(marketId: string): Promise<any[]> {
        try {
            const url = `https://clob.polymarket.com/markets/${marketId}`;
            const response = await this.httpClient.get(url);
            // Wrap in array as we expect a list of items
            return [response];
        } catch (error) {
            console.error(`Failed to fetch Polymarket market ${marketId}:`, error);
            return [];
        }
    }

    private async fetchPolymarketEvent(eventId: string): Promise<any[]> {
        try {
            // Polymarket Events API might be different, using a placeholder endpoint
            const url = `https://gamma-api.polymarket.com/events/${eventId}`;
            const response = await this.httpClient.get(url);
            return [response];
        } catch (error) {
            console.error(`Failed to fetch Polymarket event ${eventId}:`, error);
            return [];
        }
    }

    private async fetchHttpSource(url: string): Promise<any[]> {
        try {
            const response = await this.httpClient.get(url);
            if (Array.isArray(response)) {
                return response;
            }
            return [response];
        } catch (error) {
            console.error(`Failed to fetch HTTP source ${url}:`, error);
            return [];
        }
    }
}
