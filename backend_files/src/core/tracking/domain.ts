import { NormalizedItem, ChangeEvent, Snapshot, Tracker, TrackerMode } from './types';
import * as crypto from 'crypto';

export function computeChangeSet(oldSnapshot: Snapshot | null, newItems: NormalizedItem[]): ChangeEvent[] {
    const changes: ChangeEvent[] = [];
    const oldItemsMap = new Map<string, NormalizedItem>();

    if (oldSnapshot) {
        for (const item of oldSnapshot.items) {
            oldItemsMap.set(item.id, item);
        }
    }

    const newItemsMap = new Map<string, NormalizedItem>();
    for (const item of newItems) {
        newItemsMap.set(item.id, item);
    }

    // Check for added and modified
    for (const newItem of newItems) {
        const oldItem = oldItemsMap.get(newItem.id);
        if (!oldItem) {
            changes.push({
                type: 'added',
                itemId: newItem.id,
                item: newItem
            });
        } else if (oldItem.fingerprint !== newItem.fingerprint) {
            changes.push({
                type: 'modified',
                itemId: newItem.id,
                diff: computeDiff(oldItem.data, newItem.data)
            });
        }
    }

    // Check for removed
    for (const [id, oldItem] of oldItemsMap) {
        if (!newItemsMap.has(id)) {
            changes.push({
                type: 'removed',
                itemId: id,
                item: oldItem
            });
        }
    }

    return changes;
}

function computeDiff(oldData: Record<string, any>, newData: Record<string, any>): Record<string, any> {
    const diff: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
        if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
            diff[key] = { oldValue: oldData[key], newValue: newData[key] };
        }
    }
    return diff;
}

export function shouldNotify(tracker: Tracker, changes: ChangeEvent[], analysisTriggered: boolean): boolean {
    if (tracker.status !== 'active') return false;

    if (tracker.mode === 'regular') {
        // Regular trackers notify on schedule regardless of changes, 
        // BUT this function might be called during a "change detected" check too.
        // For now, assume regular runs always notify.
        return true;
    } else if (tracker.mode === 'irregular') {
        // Irregular trackers only notify if analysis says so OR if there are critical changes
        // The plan says: "send only when analysis triggers"
        return analysisTriggered;
    }

    return false;
}

export function computeSnapshotFingerprint(items: NormalizedItem[]): string {
    const sortedFingerprints = items.map(i => i.fingerprint).sort().join('');
    return crypto.createHash('sha256').update(sortedFingerprints).digest('hex');
}

export function normalizePolymarketMarket(market: any): NormalizedItem {
    // Basic normalization for Polymarket market
    const data = {
        question: market.question,
        outcomes: market.outcomes, // Assuming simple array or string
        outcomePrices: market.outcomePrices,
        volume: market.volume,
        liquidity: market.liquidity,
        endDate: market.endDate
    };

    // Create a stable fingerprint based on data content
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');

    return {
        id: market.id,
        timestamp: Date.now(),
        data,
        fingerprint
    };
}

export function normalizeGoogleNewsRss(rssItem: any): NormalizedItem {
    // Normalize Google News RSS item
    const data = {
        title: cleanText(rssItem.title || ''),
        link: rssItem.link || '',
        description: stripHtml(rssItem.description || ''),
        source: rssItem.source || extractDomain(rssItem.link || ''),
        pubDate: rssItem.pubDate || new Date().toUTCString(),
    };

    // ID is hash of link (stable across fetches)
    const id = crypto.createHash('sha256').update(rssItem.link || rssItem.guid || '').digest('hex').substring(0, 16);

    // Fingerprint includes content for change detection
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify({
        id,
        title: data.title,
        description: data.description,
        pubDate: data.pubDate,
    })).digest('hex').substring(0, 16);

    // Timestamp from pubDate
    const timestamp = parseDateToTimestamp(data.pubDate);

    return {
        id,
        timestamp,
        data,
        fingerprint
    };
}

function cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractDomain(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

function parseDateToTimestamp(dateStr: string): number {
    try {
        return new Date(dateStr).getTime();
    } catch {
        return Date.now();
    }
}
