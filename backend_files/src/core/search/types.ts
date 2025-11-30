/**
 * Web search domain types
 */

export interface SearchQuery {
    query: string;
    maxResults?: number;
    freshnessHours?: number;
    region?: string;
    includeAnswers?: boolean;
}

export interface Citation {
    url: string;
    title: string;
    textSnippet: string;
    startIndex: number;
    endIndex: number;
    rank: number;
}

export interface SearchResponse {
    text: string;
    citations: Citation[];
    provider: 'gpt-5-nano-web-search';
    respondedAt: string;
    usage?: {
        promptTokens: number;
        responseTokens: number;
    };
}

export type SearchErrorCode = 'AUTH' | 'RATE_LIMIT' | 'PROVIDER' | 'VALIDATION' | 'PARSE' | 'UNKNOWN';

export class SearchError extends Error {
    constructor(
        message: string,
        public code: SearchErrorCode,
        public details?: any
    ) {
        super(message);
        this.name = 'SearchError';
    }
}
