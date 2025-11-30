/**
 * Web search validation and sanitization
 */

import { SearchQuery, SearchError } from './types';

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 400;
const MIN_RESULTS = 1;
const MAX_RESULTS = 8;
const DEFAULT_RESULTS = 5;
const MIN_FRESHNESS_HOURS = 1;
const MAX_FRESHNESS_HOURS = 168; // 7 days
const MIN_TIMEOUT = 1000;
const MAX_TIMEOUT = 30000;
const DEFAULT_TIMEOUT = 15000;

// Keywords that indicate query should use specialized MCP servers
const POLYMARKET_KEYWORDS = [
    'market', 'polymarket', 'prediction', 'event',
    'liquidity', 'volume', 'position', 'bet', 'odds',
    'clob', 'order book', 'maker', 'taker'
];

const RSS_KEYWORDS = [
    'rss', 'feed', 'google news', 'news feed', 'subscribe',
    'rss feed', 'xml feed', 'atom feed'
];

/**
 * Validate web search query
 * @throws SearchError if validation fails
 */
export function validateSearchQuery(query: SearchQuery): void {
    // Validate query string
    if (!query.query || typeof query.query !== 'string') {
        throw new SearchError('Query must be a non-empty string', 'VALIDATION');
    }

    const trimmedQuery = query.query.trim();
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
        throw new SearchError(
            `Query too short (min ${MIN_QUERY_LENGTH} chars)`,
            'VALIDATION'
        );
    }

    if (trimmedQuery.length > MAX_QUERY_LENGTH) {
        throw new SearchError(
            `Query too long (max ${MAX_QUERY_LENGTH} chars)`,
            'VALIDATION'
        );
    }

    // Check for Polymarket queries
    const lowerQuery = trimmedQuery.toLowerCase();
    const polymarketMatch = POLYMARKET_KEYWORDS.find(kw => lowerQuery.includes(kw));
    if (polymarketMatch) {
        throw new SearchError(
            `Use polymarket MCP server for market-related queries (detected: "${polymarketMatch}")`,
            'VALIDATION',
            { rejectedKeyword: polymarketMatch }
        );
    }

    // Check for RSS queries
    const rssMatch = RSS_KEYWORDS.find(kw => lowerQuery.includes(kw));
    if (rssMatch) {
        throw new SearchError(
            `Use google-news-rss MCP server for RSS feed queries (detected: "${rssMatch}")`,
            'VALIDATION',
            { rejectedKeyword: rssMatch }
        );
    }

    // Validate maxResults
    if (query.maxResults !== undefined) {
        if (!Number.isInteger(query.maxResults) || query.maxResults < MIN_RESULTS) {
            throw new SearchError(
                `maxResults must be >= ${MIN_RESULTS}`,
                'VALIDATION'
            );
        }
        if (query.maxResults > MAX_RESULTS) {
            throw new SearchError(
                `maxResults exceeds limit (max ${MAX_RESULTS})`,
                'VALIDATION'
            );
        }
    }

    // Validate freshnessHours
    if (query.freshnessHours !== undefined) {
        if (!Number.isInteger(query.freshnessHours) || query.freshnessHours < MIN_FRESHNESS_HOURS) {
            throw new SearchError(
                `freshnessHours must be >= ${MIN_FRESHNESS_HOURS}`,
                'VALIDATION'
            );
        }
        if (query.freshnessHours > MAX_FRESHNESS_HOURS) {
            throw new SearchError(
                `freshnessHours exceeds limit (max ${MAX_FRESHNESS_HOURS})`,
                'VALIDATION'
            );
        }
    }

    // Validate region (basic check for 2-letter ISO code)
    if (query.region !== undefined) {
        if (typeof query.region !== 'string' || query.region.length !== 2) {
            throw new SearchError(
                'region must be a 2-letter ISO country code (e.g., "US", "AE")',
                'VALIDATION'
            );
        }
    }
}

/**
 * Sanitize and normalize query parameters
 */
export function sanitizeSearchQuery(query: SearchQuery): SearchQuery {
    return {
        query: query.query.trim(),
        maxResults: query.maxResults || DEFAULT_RESULTS,
        freshnessHours: query.freshnessHours,
        region: query.region?.toUpperCase(),
        includeAnswers: query.includeAnswers !== false,
    };
}

/**
 * Clean URL by removing tracking parameters
 */
export function stripTrackingParams(url: string): string {
    try {
        const urlObj = new URL(url);
        const paramsToRemove = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'ref', 'fbclid', 'gclid', 'msclkid'
        ];
        paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
        return urlObj.toString();
    } catch {
        return url; // Return original if parsing fails
    }
}

export const VALIDATION_CONSTANTS = {
    MIN_QUERY_LENGTH,
    MAX_QUERY_LENGTH,
    MIN_RESULTS,
    MAX_RESULTS,
    DEFAULT_RESULTS,
    MIN_FRESHNESS_HOURS,
    MAX_FRESHNESS_HOURS,
    DEFAULT_TIMEOUT,
};
