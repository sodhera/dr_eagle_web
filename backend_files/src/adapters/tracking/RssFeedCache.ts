import { Firestore } from '@google-cloud/firestore';
import { RssItem } from '../../core/tracking/googleNewsRss';

/**
 * Cached RSS feed result
 */
export interface CachedFeed {
    queryKey: string;
    items: RssItem[];
    fingerprints: string[];
    fetchedAt: number;
}

/**
 * Firestore-backed cache for RSS feed results
 * Enables de-duplication across users tracking the same queries
 */
export class RssFeedCache {
    private collection: FirebaseFirestore.CollectionReference;

    constructor(private firestore: Firestore) {
        this.collection = firestore.collection('rss_feed_cache');
    }

    /**
     * Gets a cached feed by queryKey
     */
    async get(queryKey: string): Promise<CachedFeed | null> {
        const doc = await this.collection.doc(queryKey).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data() as CachedFeed;
    }

    /**
     * Stores a feed result in the cache
     */
    async set(queryKey: string, items: RssItem[], fetchedAt: number): Promise<void> {
        const fingerprints = items.map(item => this.computeItemFingerprint(item));

        const cached: CachedFeed = {
            queryKey,
            items,
            fingerprints,
            fetchedAt,
        };

        await this.collection.doc(queryKey).set(cached);
    }

    /**
     * Checks if a cached feed is stale
     * @param maxAgeMs Maximum age in milliseconds (default: 3 hours)
     */
    async isStale(queryKey: string, maxAgeMs: number = 3 * 60 * 60 * 1000): Promise<boolean> {
        const cached = await this.get(queryKey);
        if (!cached) {
            return true;
        }

        const age = Date.now() - cached.fetchedAt;
        return age > maxAgeMs;
    }

    /**
     * Invalidates a cached feed
     */
    async invalidate(queryKey: string): Promise<void> {
        await this.collection.doc(queryKey).delete();
    }

    /**
     * Computes a fingerprint for an RSS item
     */
    private computeItemFingerprint(item: RssItem): string {
        const crypto = require('crypto');
        const data = JSON.stringify({
            link: item.link,
            title: item.title,
            pubDate: item.pubDate,
        });
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }
}
