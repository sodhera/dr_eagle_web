/**
 * Tests for web search validation logic
 */

import assert from "node:assert/strict";
import { validateSearchQuery, stripTrackingParams } from './validation';
import { SearchError } from './types';

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
    tests.push({ name, fn });
}

function expectThrow(fn: () => unknown, messageMatch?: RegExp | string): void {
    let threw = false;
    try {
        fn();
    } catch (error: any) {
        threw = true;
        if (messageMatch) {
            if (messageMatch instanceof RegExp) {
                assert.match(error.message, messageMatch);
            } else {
                assert.ok(error.message.includes(messageMatch), `Expected error to include "${messageMatch}", got "${error.message}"`);
            }
        }
    }
    if (!threw) {
        assert.fail("Expected function to throw");
    }
}

test('validateSearchQuery accepts valid queries', () => {
    validateSearchQuery({ query: 'latest tech news' });
    validateSearchQuery({ query: 'weather in Tokyo', maxResults: 3 });
    validateSearchQuery({ query: 'AI developments', freshnessHours: 24 });
    validateSearchQuery({ query: 'local news', region: 'US' });
});

test('validateSearchQuery rejects empty or non-string queries', () => {
    expectThrow(() => validateSearchQuery({ query: '' }), "Query must be a non-empty string");
    expectThrow(() => validateSearchQuery({ query: '  ' }), "too short");
    // @ts-ignore
    expectThrow(() => validateSearchQuery({ query: 123 }), "Query must be a non-empty string");
});

test('validateSearchQuery rejects queries that are too short', () => {
    expectThrow(() => validateSearchQuery({ query: 'hi' }), "too short");
});

test('validateSearchQuery rejects queries that are too long', () => {
    const longQuery = 'a'.repeat(401);
    expectThrow(() => validateSearchQuery({ query: longQuery }), "too long");
});

test('validateSearchQuery rejects Polymarket-related queries', () => {
    expectThrow(() => validateSearchQuery({ query: 'polymarket odds' }), /polymarket MCP/);
    expectThrow(() => validateSearchQuery({ query: 'election market' }), /polymarket MCP/);
    expectThrow(() => validateSearchQuery({ query: 'btc liquidity' }), /polymarket MCP/);
    expectThrow(() => validateSearchQuery({ query: 'event prediction' }), /polymarket MCP/);
});

test('validateSearchQuery rejects RSS-related queries', () => {
    expectThrow(() => validateSearchQuery({ query: 'google news rss' }), /google-news-rss MCP/);
    expectThrow(() => validateSearchQuery({ query: 'subscribe to feed' }), /google-news-rss MCP/);
});

test('validateSearchQuery validates maxResults', () => {
    expectThrow(() => validateSearchQuery({ query: 'test', maxResults: 0 }), /maxResults/);
    expectThrow(() => validateSearchQuery({ query: 'test', maxResults: 9 }), /maxResults/);
    expectThrow(() => validateSearchQuery({ query: 'test', maxResults: 5.5 }), /maxResults/);
});

test('validateSearchQuery validates freshnessHours', () => {
    expectThrow(() => validateSearchQuery({ query: 'test', freshnessHours: 0 }), /freshnessHours/);
    expectThrow(() => validateSearchQuery({ query: 'test', freshnessHours: 169 }), /freshnessHours/);
});

test('validateSearchQuery validates region', () => {
    expectThrow(() => validateSearchQuery({ query: 'test', region: 'USA' }), /region/);
    expectThrow(() => validateSearchQuery({ query: 'test', region: 'u' }), /region/);
});

test('stripTrackingParams removes tracking parameters', () => {
    const url = 'https://example.com/page?utm_source=twitter&utm_medium=social&ref=homepage&id=123';
    const cleaned = stripTrackingParams(url);
    assert.equal(cleaned, 'https://example.com/page?id=123');
});

test('stripTrackingParams handles URLs without parameters', () => {
    const url = 'https://example.com/page';
    assert.equal(stripTrackingParams(url), url);
});

test('stripTrackingParams handles invalid URLs gracefully', () => {
    const url = 'not-a-url';
    assert.equal(stripTrackingParams(url), url);
});

async function run(): Promise<void> {
    console.log('Running validation tests...');
    for (const { name, fn } of tests) {
        try {
            await fn();
            console.log(`✓ ${name} `);
        } catch (error) {
            console.error(`✗ ${name} `);
            console.error(error);
            process.exitCode = 1;
        }
    }
}

void run();
