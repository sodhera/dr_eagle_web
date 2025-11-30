/**
 * Web search service - orchestrates validation and search execution
 */

import { WebSearchClient } from '../../adapters/openai/webSearchClient';
import { SearchQuery, SearchResponse } from '../../core/search/types';
import { validateSearchQuery, sanitizeSearchQuery } from '../../core/search/validation';

export class WebSearchService {
    constructor(private client: WebSearchClient) { }

    /**
     * Execute a web search with validation and sanitization
     */
    async search(rawQuery: SearchQuery): Promise<SearchResponse> {
        // Validate query
        validateSearchQuery(rawQuery);

        // Sanitize parameters
        const query = sanitizeSearchQuery(rawQuery);

        // Execute search via adapter
        const response = await this.client.search(query);

        return response;
    }
}
