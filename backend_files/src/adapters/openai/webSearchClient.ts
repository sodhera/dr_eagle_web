/**
 * Web search client adapter using OpenAI's gpt-5-nano with web_search tool
 */

import OpenAI from 'openai';
import { SearchQuery, SearchResponse, SearchError, Citation } from '../../core/search/types';
import { stripTrackingParams } from '../../core/search/validation';

export class WebSearchClient {
    private client: OpenAI;
    private model = 'gpt-5-nano';
    private timeout = 15000; // 15 seconds

    constructor(apiKey: string) {
        if (!apiKey || apiKey.trim() === '') {
            const error = new Error('WebSearchClient: OPENAI_API_KEY is empty or undefined');
            console.error('[WebSearchClient] CRITICAL:', error.message);
            throw error;
        }
        console.log('[WebSearchClient] Initializing with API key:', apiKey.substring(0, 10) + '...');
        this.client = new OpenAI({ apiKey });
    }

    /**
     * Execute a web search using gpt-5-nano with web_search tool
     */
    async search(query: SearchQuery): Promise<SearchResponse> {
        const startTime = Date.now();

        try {
            const response = await this.client.responses.create({
                model: this.model,
                tools: [{ type: 'web_search' }],
                input: this.buildPrompt(query),
                max_output_tokens: 16000, // Increased to handle full web search responses
            } as any); // Using 'as any' since this API might not be fully typed yet

            return this.parseResponse(response, startTime);
        } catch (error: any) {
            throw this.mapError(error);
        }
    }

    /**
     * Build search prompt with optional parameters
     */
    private buildPrompt(query: SearchQuery): string {
        let prompt = query.query;

        if (query.freshnessHours) {
            prompt += ` (prefer results from the last ${query.freshnessHours} hours)`;
        }

        if (query.region) {
            prompt += ` (prefer results from region: ${query.region})`;
        }

        if (query.includeAnswers) {
            prompt += ` Please provide a comprehensive answer with citations.`;
        }

        return prompt;
    }

    /**
     * Parse gpt-5-nano response and extract text + citations
     */
    private parseResponse(response: any, startTime: number): SearchResponse {
        // Check if response is incomplete
        if (response.status === 'incomplete') {
            throw new SearchError(
                `Response incomplete: ${response.incomplete_details?.reason || 'unknown reason'}`,
                'PARSE',
                { response: JSON.stringify(response).substring(0, 500) }
            );
        }

        // Response might be an array of steps or an object with an 'output' array
        const steps = Array.isArray(response) ? response : (response.output || []);

        // Find the message step
        const messageStep = steps.find((step: any) => step.type === 'message');

        if (!messageStep || !messageStep.content?.[0]) {
            throw new SearchError('Invalid response format - no message content', 'PARSE', {
                response: JSON.stringify(response).substring(0, 500)
            });
        }

        const outputContent = messageStep.content[0];

        if (outputContent.type !== 'output_text') {
            throw new SearchError(
                `Unexpected content type: ${outputContent.type}`,
                'PARSE',
                { contentType: outputContent.type }
            );
        }

        const text = outputContent.text || '';
        const annotations = outputContent.annotations || [];

        // Extract citations from url_citation annotations
        const citations: Citation[] = annotations
            .filter((a: any) => a.type === 'url_citation')
            .map((a: any, index: number) => ({
                url: stripTrackingParams(a.url),
                title: a.title || '',
                textSnippet: text.substring(a.start_index, a.end_index),
                startIndex: a.start_index,
                endIndex: a.end_index,
                rank: index + 1,
            }));

        return {
            text,
            citations,
            provider: 'gpt-5-nano-web-search',
            respondedAt: new Date().toISOString(),
            usage: response.usage ? {
                promptTokens: response.usage.prompt_tokens || 0,
                responseTokens: response.usage.completion_tokens || 0,
            } : undefined,
        };
    }

    /**
     * Map provider errors to typed SearchError
     */
    private mapError(error: any): SearchError {
        // Authentication errors
        if (error.status === 401 || error.status === 403) {
            return new SearchError('Authentication failed', 'AUTH', error);
        }

        // Rate limit errors
        if (error.status === 429) {
            return new SearchError('Rate limit exceeded', 'RATE_LIMIT', error);
        }

        // Server errors
        if (error.status >= 500) {
            return new SearchError(
                `Provider error: ${error.message || 'Unknown error'}`,
                'PROVIDER',
                error
            );
        }

        // Timeout errors
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return new SearchError('Request timed out', 'PROVIDER', error);
        }

        // Generic error
        return new SearchError(
            `Search failed: ${error.message || 'Unknown error'}`,
            'UNKNOWN',
            error
        );
    }
}
