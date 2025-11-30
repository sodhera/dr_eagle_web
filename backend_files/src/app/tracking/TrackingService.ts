import { createPythonExecutionClient } from '../../adapters/pythonExecution';
import { createHttpClient } from '../../adapters/http/httpClient';
import { OpenAIAdapter } from '../../adapters/openai/OpenAIAdapter';
import { Message } from '../../core/agent/types';
import { FirestoreTrackingStore } from '../../adapters/tracking/FirestoreTrackingStore';
import { Tracker, TrackerId, UserId, TrackerTarget, TrackerMode, TrackerAnalysis, Subscription, TrackerRun, Snapshot, NormalizedItem, ChangeEvent, AnalysisResult, NotificationRecord } from '../../core/tracking/types';
import { computeChangeSet, computeSnapshotFingerprint, normalizePolymarketMarket, normalizeGoogleNewsRss, shouldNotify } from '../../core/tracking/domain';
import { v4 as uuidv4 } from 'uuid';
import { LoggingService } from '../logging/LoggingService';
import { PYTHON_TEMPLATES, PROMPT_TEMPLATES } from '../../core/tracking/templates';
import { TrackingDataFetcher } from '../../adapters/tracking/TrackingDataFetcher';
import { RssFeedCache } from '../../adapters/tracking/RssFeedCache';
import { computeQueryKey } from '../../core/tracking/googleNewsRss';

export class TrackingService {
    private pythonClient;
    private rssFeedCache: RssFeedCache;

    constructor(
        private store: FirestoreTrackingStore,
        private fetcher: TrackingDataFetcher,
        private logging?: LoggingService,
        private openAIAdapter?: OpenAIAdapter
    ) {
        // Initialize Python Client
        const httpClient = createHttpClient();
        this.pythonClient = createPythonExecutionClient(httpClient, {
            functionUrl: process.env.PYTHON_EXECUTION_URL || 'https://us-central1-sodhera-search.cloudfunctions.net/execute-python-code'
        });
        // Initialize RSS Feed Cache
        this.rssFeedCache = new RssFeedCache(store.getFirestore());
    }

    async createTracker(
        userId: UserId,
        target: TrackerTarget,
        mode: TrackerMode,
        analysis: TrackerAnalysis
    ): Promise<Tracker> {
        const id = uuidv4();
        const now = Date.now();

        const tracker: Tracker = {
            id,
            ownerId: userId,
            visibility: 'personal', // Default for now
            target,
            mode,
            analysis,
            schedule: { type: 'interval', value: '3600' }, // Default 1h
            notification: { channels: ['mcp_callback'] },
            status: 'active',
            createdAt: now,
            updatedAt: now
        };

        await this.store.createTracker(tracker);

        // Auto-subscribe owner
        const sub: Subscription = {
            trackerId: id,
            userId,
            role: 'owner',
            createdAt: now
        };
        await this.store.addSubscription(sub);

        if (this.logging) {
            await this.logging.log({
                timestamp: Date.now(),
                userId,
                sessionId: 'system', // Trackers might not be tied to a chat session
                logType: 'agentAction',
                level: 'info',
                environment: 'production', // TODO: Get from config
                version: '1.0.0', // TODO: Get from config
                action: 'tracker_created',
                details: { trackerId: id, targetType: target.type }
            });
        }

        return tracker;
    }

    async listTrackers(userId: UserId): Promise<Tracker[]> {
        return this.store.listTrackers(userId);
    }

    async getTracker(trackerId: TrackerId): Promise<Tracker | null> {
        return this.store.getTracker(trackerId);
    }

    async updateTracker(tracker: Tracker): Promise<void> {
        tracker.updatedAt = Date.now();
        await this.store.updateTracker(tracker);
    }

    async subscribe(trackerId: TrackerId, userId: UserId, role: 'owner' | 'viewer'): Promise<void> {
        const sub: Subscription = {
            trackerId,
            userId,
            role,
            createdAt: Date.now()
        };
        await this.store.addSubscription(sub);
    }

    async runDueTrackers(): Promise<void> {
        const trackers = await this.store.listAllActiveTrackers();
        for (const tracker of trackers) {
            if (await this.isDue(tracker)) {
                try {
                    await this.runTrackerOnce(tracker.id);
                } catch (e) {
                    console.error(`Failed to run tracker ${tracker.id}`, e);
                }
            }
        }
    }

    private async isDue(tracker: Tracker): Promise<boolean> {
        if (tracker.schedule.type !== 'interval') return false; // Only interval supported for now

        const lastRun = await this.store.getLastRun(tracker.id);
        const intervalSeconds = parseInt(tracker.schedule.value, 10);
        const intervalMs = intervalSeconds * 1000;
        const now = Date.now();

        if (!lastRun) {
            // Run immediately if never run
            return true;
        }

        return (lastRun.timestamp + intervalMs) <= now;
    }

    async runTrackerOnce(trackerId: TrackerId): Promise<TrackerRun> {
        const tracker = await this.store.getTracker(trackerId);
        if (!tracker) throw new Error(`Tracker ${trackerId} not found`);

        const lastSnapshot = await this.store.getLastSnapshot(trackerId);

        // 1. Fetch Data (with caching for RSS feeds)
        let rawData: any[];

        if (tracker.target.type === 'googleNewsRssSearch') {
            const queryKey = computeQueryKey(tracker.target.querySpec);
            const cached = await this.rssFeedCache.get(queryKey);

            // Check if cache is stale (3 hours default)
            if (!cached || await this.rssFeedCache.isStale(queryKey, 3 * 60 * 60 * 1000)) {
                // Fetch fresh data
                rawData = await this.fetcher.fetch(tracker.target);
                await this.rssFeedCache.set(queryKey, rawData, Date.now());
            } else {
                // Use cached data
                rawData = cached.items;
            }
        } else {
            rawData = await this.fetcher.fetch(tracker.target);
        }

        // 2. Normalize based on target type
        let newItems: NormalizedItem[];
        if (tracker.target.type === 'googleNewsRssSearch') {
            newItems = rawData.map(d => normalizeGoogleNewsRss(d));
        } else {
            newItems = rawData.map(d => normalizePolymarketMarket(d));
        }

        // 3. Compute Changes
        const changes = computeChangeSet(lastSnapshot, newItems);

        // 4. Create Snapshot
        const snapshot: Snapshot = {
            trackerId,
            timestamp: Date.now(),
            items: newItems,
            fingerprint: computeSnapshotFingerprint(newItems)
        };
        await this.store.saveSnapshot(snapshot);

        // 5. Analysis
        let analysisResult: AnalysisResult;

        if (tracker.analysis.type === 'computational') {
            analysisResult = await this.runComputationalAnalysis(tracker, changes, newItems);
        } else {
            analysisResult = await this.runAiAnalysis(tracker, changes, newItems);
        }

        // 6. Notification Decision
        const notify = shouldNotify(tracker, changes, analysisResult.triggered);
        if (notify) {
            await this.dispatchNotifications(tracker, analysisResult);
        }

        // 7. Save Run
        const run: TrackerRun = {
            id: uuidv4(),
            trackerId,
            timestamp: Date.now(),
            snapshotId: snapshot.timestamp.toString(),
            changeEvents: changes,
            analysisResult,
            status: 'completed'
        };
        await this.store.saveRun(run);

        return run;
    }

    private async runComputationalAnalysis(tracker: Tracker, changes: ChangeEvent[], items: NormalizedItem[]): Promise<AnalysisResult> {
        if (tracker.analysis.type !== 'computational') throw new Error("Invalid analysis type");

        const templateId = tracker.analysis.pythonTemplateId || 'basic_threshold';
        const codeTemplate = PYTHON_TEMPLATES[templateId] || PYTHON_TEMPLATES['basic_threshold'];

        const dataSetup = `
items = ${JSON.stringify(items.map(i => i.data))}
changes = ${JSON.stringify(changes)}
`;
        const code = dataSetup + codeTemplate;

        try {
            const result = await this.pythonClient.execute({
                code: code,
                // We are embedding data in code for now, but could pass as input_data if template supports it
            });

            // Parse the JSON output from the python script
            let analysisOutput = { triggered: false, summary: "No output", footnote: "" };
            try {
                // Find the last line that looks like JSON
                const lines = result.output.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                analysisOutput = JSON.parse(lastLine);
            } catch (e) {
                console.warn("Failed to parse Python output JSON", result.output);
                analysisOutput.summary = "Failed to parse output";
            }

            return {
                trackerId: tracker.id,
                runId: uuidv4(),
                timestamp: Date.now(),
                type: 'computational',
                summary: analysisOutput.summary,
                triggered: analysisOutput.triggered,
                footnote: analysisOutput.footnote || "Computed by Python"
            };

        } catch (e: any) {
            return {
                trackerId: tracker.id,
                runId: uuidv4(),
                timestamp: Date.now(),
                type: 'computational',
                summary: `Analysis execution error: ${e.message}`,
                triggered: false
            };
        }
    }

    private async runAiAnalysis(tracker: Tracker, changes: ChangeEvent[], items: NormalizedItem[]): Promise<AnalysisResult> {
        if (!this.openAIAdapter) {
            return {
                trackerId: tracker.id,
                runId: uuidv4(),
                timestamp: Date.now(),
                type: 'ai',
                summary: "AI Adapter not available",
                triggered: false
            };
        }

        // Cast to any or specific type to access promptTemplateId safely
        const analysis = tracker.analysis as any;
        const templateId = analysis.promptTemplateId || 'default_persona';
        const template = PROMPT_TEMPLATES[templateId] || PROMPT_TEMPLATES['default_persona'];

        const prompt = template
            .replace('{{TARGET}}', JSON.stringify(tracker.target))
            .replace('{{ITEMS}}', JSON.stringify(items.map(i => i.data)))
            .replace('{{CHANGES}}', JSON.stringify(changes));

        try {
            const content = await this.openAIAdapter.complete([
                { role: 'system', content: 'You are a helpful analysis assistant. Output valid JSON only.' },
                { role: 'user', content: prompt }
            ]);

            // Clean markdown code blocks if present
            const jsonStr = content.replace(/```json\n?|\n?```/g, '');
            const result = JSON.parse(jsonStr);

            return {
                trackerId: tracker.id,
                runId: uuidv4(),
                timestamp: Date.now(),
                type: 'ai',
                summary: result.summary || "AI Analysis complete",
                triggered: result.triggered || false,
                footnote: result.footnote
            };
        } catch (e: any) {
            return {
                trackerId: tracker.id,
                runId: uuidv4(),
                timestamp: Date.now(),
                type: 'ai',
                summary: `AI Analysis failed: ${e.message}`,
                triggered: false
            };
        }
    }

    private async dispatchNotifications(tracker: Tracker, analysis: AnalysisResult): Promise<void> {
        // 1. Get subscriptions
        const subs = await this.store.listSubscriptions(tracker.id);

        // 2. For each sub, check prefs and send
        for (const sub of subs) {
            // TODO: Check delivery prefs, rate limits, quiet hours

            const record: NotificationRecord = {
                id: uuidv4(),
                trackerId: tracker.id,
                runId: analysis.runId,
                userId: sub.userId,
                timestamp: Date.now(),
                channel: 'mcp_callback', // Default
                reason: analysis.triggered ? 'trigger' : 'scheduled',
                status: 'sent'
            };

            await this.store.saveNotificationRecord(record);

            if (this.logging) {
                await this.logging.log({
                    timestamp: Date.now(),
                    userId: sub.userId,
                    sessionId: 'system',
                    logType: 'agentAction',
                    level: 'info',
                    environment: 'production',
                    version: '1.0.0',
                    action: 'notification_sent',
                    details: { trackerId: tracker.id, summary: analysis.summary }
                });
            }
        }
    }


}
