import { XMLParser } from 'fast-xml-parser';
import { HttpClient } from '../http/httpClient';
import { RssItem } from '../../core/tracking/googleNewsRss';

/**
 * Client for fetching and parsing Google News RSS feeds
 */
export class GoogleNewsRssClient {
    private parser: XMLParser;

    constructor(private httpClient: HttpClient) {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
        });
    }

    /**
     * Fetches and parses a Google News RSS feed
     * @param url Full RSS feed URL
     * @returns Array of normalized RSS items
     */
    async fetchFeed(url: string): Promise<RssItem[]> {
        try {
            const response = await this.httpClient.get(url, {
                timeoutMs: 10000, // 10s timeout
                responseType: 'text',
                headers: {
                    'User-Agent': 'tracking-agents-google-news/0.1',
                },
            });

            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}`);
            }

            const xmlContent = response.data as string;
            const parsed = this.parser.parse(xmlContent);

            // Extract items from RSS structure
            const channel = parsed.rss?.channel;
            if (!channel) {
                console.warn('Invalid RSS feed structure, no channel found');
                return [];
            }

            const items = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);

            return items.map((item: any) => this.normalizeRssItem(item));
        } catch (error: any) {
            // Handle rate limiting
            if (error.response?.status === 429 || error.response?.status === 503) {
                throw new Error(`Google News RSS rate limit: ${error.response.status}`);
            }

            console.error('Error fetching Google News RSS feed:', error.message);
            return [];
        }
    }

    /**
     * Normalizes a raw RSS item to our standard format
     */
    private normalizeRssItem(item: any): RssItem {
        return {
            guid: item.guid || item.link || '',
            title: this.cleanText(item.title || ''),
            link: item.link || '',
            description: this.stripHtml(item.description || ''),
            source: item.source?.['#text'] || this.extractDomain(item.link || ''),
            pubDate: item.pubDate || new Date().toUTCString(),
        };
    }

    /**
     * Strips HTML tags and normalizes whitespace
     */
    private stripHtml(html: string): string {
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace &nbsp;
            .replace(/&amp;/g, '&') // Replace &amp;
            .replace(/&lt;/g, '<') // Replace &lt;
            .replace(/&gt;/g, '>') // Replace &gt;
            .replace(/&quot;/g, '"') // Replace &quot;
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    /**
     * Cleans text by normalizing whitespace
     */
    private cleanText(text: string): string {
        return text.replace(/\s+/g, ' ').trim();
    }

    /**
     * Extracts domain from a URL
     */
    private extractDomain(url: string): string {
        try {
            const parsed = new URL(url);
            return parsed.hostname.replace(/^www\./, '');
        } catch {
            return '';
        }
    }
}
