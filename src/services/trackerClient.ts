import { Tracker, TrackerRun } from '@/types/tracking';

// Mock Data
const MOCK_TRACKERS: Tracker[] = [
    {
        id: 't1',
        ownerId: 'user1',
        visibility: 'personal',
        target: { type: 'polymarketMarket', marketId: '12345' },
        mode: 'regular',
        analysis: { type: 'ai', promptTemplateId: 'crypto_trader' },
        schedule: { type: 'interval', value: '3600' },
        notification: { channels: ['mcp_callback'] },
        status: 'active',
        createdAt: Date.now() - 1000000,
        updatedAt: Date.now() - 5000,
    },
    {
        id: 't2',
        ownerId: 'user1',
        visibility: 'personal',
        target: { type: 'googleNewsRssSearch', querySpec: { q: 'AI Agents' }, edition: 'US' },
        mode: 'irregular',
        analysis: { type: 'computational', thresholdConfig: {}, pythonTemplateId: 'basic_threshold' },
        schedule: { type: 'interval', value: '10800' },
        notification: { channels: ['email'] },
        status: 'active',
        createdAt: Date.now() - 2000000,
        updatedAt: Date.now() - 10000,
    },
    {
        id: 't3',
        ownerId: 'user1',
        visibility: 'shared',
        target: { type: 'httpSource', url: 'https://api.example.com/data' },
        mode: 'regular',
        analysis: { type: 'ai', promptTemplateId: 'default_persona' },
        schedule: { type: 'cron', value: '0 9 * * *' },
        notification: { channels: ['mcp_callback'] },
        status: 'paused',
        createdAt: Date.now() - 5000000,
        updatedAt: Date.now() - 200000,
    },
    {
        id: 't4',
        ownerId: 'user1',
        visibility: 'shared',
        target: { type: 'polymarketMarket', marketId: 'trump-gov-shutdown-dec' },
        mode: 'regular',
        analysis: { type: 'ai', promptTemplateId: 'political_analyst' },
        schedule: { type: 'interval', value: '300' },
        notification: { channels: ['mcp_callback'] },
        status: 'active',
        createdAt: Date.now() - 100000,
        updatedAt: Date.now() - 1000,
    }
];

import { getMcpToken } from './mcpAuth';

const AGENT_BASE_URL = 'https://us-central1-audit-3a7ec.cloudfunctions.net';

export async function listTrackers(): Promise<Tracker[]> {
    const token = await getMcpToken();

    const response = await fetch(`${AGENT_BASE_URL}/agent/trackers`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list trackers: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function runTracker(trackerId: string): Promise<TrackerRun> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
        id: `run_${Date.now()}`,
        trackerId,
        timestamp: Date.now(),
        snapshotId: `snap_${Date.now()}`,
        changeEvents: [
            { type: 'modified', itemId: 'item1', diff: { price: { old: 0.5, new: 0.6 } } }
        ],
        analysisResult: {
            trackerId,
            runId: `run_${Date.now()}`,
            timestamp: Date.now(),
            type: 'ai',
            summary: 'Significant price movement detected.',
            triggered: true,
            footnote: 'AI Analysis'
        },
        status: 'completed'
    };
}

export async function createTracker(tracker: Omit<Tracker, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tracker> {
    const token = await getMcpToken();

    const response = await fetch(`${AGENT_BASE_URL}/agent/trackers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tracker)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create tracker: ${response.status} ${errorText}`);
    }

    return response.json();
}
