import crypto from 'crypto';

/**
 * Google News RSS Query Specification
 * Structured query model for building Google News RSS search feeds
 */
export interface GoogleNewsQuerySpec {
    /** Terms that must all appear (implicit AND) */
    all?: string[];
    /** Terms where any can appear (OR) */
    any?: string[];
    /** Terms to exclude (prefixed with -) */
    none?: string[];
    /** Exact phrases (will be quoted) */
    exact?: string[];
    /** Domains to filter by (site: operator) */
    sites?: string[];
    /** Time filter: '24h' | '48h' | '7d' | { after, before } */
    time?: string | { after?: string; before?: string };
    /** Wildcard phrases (e.g., "nigeria * election") */
    wildcards?: string[];
    /** Edition code (e.g., 'AE:en', 'US:en') */
    edition?: string;
}

/**
 * RSS feed item from Google News
 */
export interface RssItem {
    guid: string;
    title: string;
    link: string;
    description: string;
    source?: string;
    pubDate: string; // RFC822 format
}

/**
 * Supported Google News editions (English only)
 */
export const SUPPORTED_EDITIONS = [
    { code: 'US:en', gl: 'US', ceid: 'US:en', description: 'United States (English)' },
    { code: 'AE:en', gl: 'AE', ceid: 'AE:en', description: 'UAE (English)' },
    { code: 'GB:en', gl: 'GB', ceid: 'GB:en', description: 'United Kingdom (English)' },
    { code: 'IN:en', gl: 'IN', ceid: 'IN:en', description: 'India (English)' },
    { code: 'SG:en', gl: 'SG', ceid: 'SG:en', description: 'Singapore (English)' },
    { code: 'AU:en', gl: 'AU', ceid: 'AU:en', description: 'Australia (English)' },
] as const;

/**
 * Supported query operators documentation
 */
export const SUPPORTED_OPERATORS = `
# Supported Google News RSS Operators

- **AND (default)**: Space-separated terms (e.g., "nigeria bank")
- **OR**: Use OR keyword or | (e.g., "nigeria OR ghana")
- **NOT**: Prefix with - (e.g., "-football")
- **Exact phrase**: Wrap in quotes (e.g., "\\"central bank\\"")
- **Wildcard**: Use * inside phrases (e.g., "\\"nigeria * election\\"")
- **Site filter**: site:domain.com (e.g., "site:reuters.com")
- **Time filters**: 
  - when:24h, when:48h, when:7d
  - after:YYYY/MM/DD, before:YYYY/MM/DD

## Not Supported
- filetype:, intitle:, source:, location:
- Numeric ranges
- Non-English editions
`;

/**
 * Validates a query specification
 * @throws Error if spec contains unsupported operators or invalid edition
 */
export function validateQuerySpec(spec: GoogleNewsQuerySpec): void {
    // Check edition
    if (spec.edition) {
        const validEditions = SUPPORTED_EDITIONS.map(e => e.code);
        if (!validEditions.includes(spec.edition as any)) {
            throw new Error(`Unsupported edition: ${spec.edition}. Must be one of: ${validEditions.join(', ')}`);
        }
        if (!spec.edition.endsWith(':en')) {
            throw new Error('Only English editions are supported (must end with :en)');
        }
    }

    // Check for non-ASCII characters in terms
    const allTerms = [
        ...(spec.all || []),
        ...(spec.any || []),
        ...(spec.none || []),
        ...(spec.exact || []),
        ...(spec.wildcards || []),
    ];

    for (const term of allTerms) {
        if (!/^[\x00-\x7F]*$/.test(term)) {
            throw new Error(`Non-ASCII characters not allowed in query terms: "${term}"`);
        }
    }

    // Check for unsupported operators in terms
    const unsupportedPatterns = /\b(filetype:|intitle:|source:|location:)/i;
    for (const term of allTerms) {
        if (unsupportedPatterns.test(term)) {
            throw new Error(`Unsupported operator found in term: "${term}"`);
        }
    }
}

/**
 * Builds the search query string from a structured spec
 */
export function buildSearchQuery(spec: GoogleNewsQuerySpec): string {
    const parts: string[] = [];

    // Add 'all' terms (implicit AND)
    if (spec.all && spec.all.length > 0) {
        parts.push(spec.all.join(' '));
    }

    // Add 'exact' phrases (quoted)
    if (spec.exact && spec.exact.length > 0) {
        parts.push(...spec.exact.map(phrase => `"${phrase}"`));
    }

    // Add 'any' terms (OR)
    if (spec.any && spec.any.length > 0) {
        parts.push(`(${spec.any.join(' OR ')})`);
    }

    // Add 'none' terms (excluded)
    if (spec.none && spec.none.length > 0) {
        parts.push(...spec.none.map(term => `-${term}`));
    }

    // Add 'sites' filter
    if (spec.sites && spec.sites.length > 0) {
        const siteFilters = spec.sites.map(site => `site:${site}`);
        parts.push(`(${siteFilters.join(' OR ')})`);
    }

    // Add 'wildcards' (pass through verbatim)
    if (spec.wildcards && spec.wildcards.length > 0) {
        parts.push(...spec.wildcards);
    }

    // Add time filter
    if (spec.time) {
        if (typeof spec.time === 'string') {
            // Simple format: '24h', '48h', '7d'
            parts.push(`when:${spec.time}`);
        } else {
            // Date range format
            if (spec.time.after) {
                parts.push(`after:${spec.time.after}`);
            }
            if (spec.time.before) {
                parts.push(`before:${spec.time.before}`);
            }
        }
    }

    return parts.join(' ').trim();
}

/**
 * Builds the full Google News RSS feed URL
 */
export function buildFeedUrl(spec: GoogleNewsQuerySpec): string {
    const query = buildSearchQuery(spec);
    const encodedQuery = encodeURIComponent(query);

    // Parse edition
    const edition = SUPPORTED_EDITIONS.find(e => e.code === (spec.edition || 'US:en'));
    if (!edition) {
        throw new Error(`Invalid edition: ${spec.edition}`);
    }

    const params = new URLSearchParams({
        q: query,
        hl: 'en-US',
        gl: edition.gl,
        ceid: edition.ceid,
    });

    return `https://news.google.com/rss/search?${params.toString()}`;
}

/**
 * Computes a stable query key for caching
 * Hash is based on the rendered query + edition
 */
export function computeQueryKey(spec: GoogleNewsQuerySpec): string {
    const query = buildSearchQuery(spec);
    const edition = spec.edition || 'US:en';
    const editionData = SUPPORTED_EDITIONS.find(e => e.code === edition);

    const cacheInput = JSON.stringify({
        q: query,
        gl: editionData?.gl,
        ceid: editionData?.ceid,
    });

    return crypto.createHash('sha256').update(cacheInput).digest('hex').substring(0, 16);
}
