export type TrackerId = string;
export type UserId = string;
export type SpaceId = string;

export type TrackerVisibility = 'personal' | 'shared';
export type TrackerMode = 'regular' | 'irregular';
export type TrackerStatus = 'active' | 'paused' | 'error';
export type AnalysisType = 'computational' | 'ai';

export interface Tracker {
    id: TrackerId;
    ownerId: UserId;
    visibility: TrackerVisibility;
    target: TrackerTarget;
    mode: TrackerMode;
    analysis: TrackerAnalysis;
    schedule: TrackerSchedule;
    notification: TrackerNotification;
    status: TrackerStatus;
    createdAt: number;
    updatedAt: number;
    // For shared trackers
    createdBy?: UserId;
    allowedRoles?: string[];
    defaultSchedule?: TrackerSchedule;
}

export type TrackerTarget =
    | { type: 'polymarketMarket'; marketId: string }
    | { type: 'polymarketEvent'; eventId: string }
    | { type: 'substackFeed'; url: string }
    | { type: 'httpSource'; url: string }
    | { type: 'googleNewsRssSearch'; querySpec: any; edition: string } // Import GoogleNewsQuerySpec from googleNewsRss.ts
    | { type: 'composite'; dependencyTrackerIds: TrackerId[] };

export type TrackerAnalysis =
    | { type: 'computational'; thresholdConfig: Record<string, any>; pythonTemplateId: string }
    | { type: 'ai'; promptTemplateId: string; personaRefs?: string[]; inputProjectionRules?: string[] };

export interface TrackerSchedule {
    type: 'cron' | 'interval';
    value: string; // e.g. "0 9 * * *" or "3600" (seconds)
}

export interface TrackerNotification {
    channels: string[]; // e.g. ['mcp_callback']
    rateLimitPerDay?: number;
    quietHours?: { start: string; end: string; timezone: string };
}

export interface Subscription {
    trackerId: TrackerId;
    userId: UserId;
    role: 'owner' | 'viewer';
    deliveryPrefs?: {
        channels?: string[];
        frequency?: 'immediate' | 'digest';
    };
    createdAt: number;
}

export interface NormalizedItem {
    id: string;
    timestamp: number;
    data: Record<string, any>;
    fingerprint: string; // Hash for change detection
}

export interface Snapshot {
    trackerId: TrackerId;
    timestamp: number;
    items: NormalizedItem[];
    fingerprint: string; // Hash of all item fingerprints
}

export interface ChangeEvent {
    type: 'added' | 'removed' | 'modified';
    itemId: string;
    diff?: Record<string, any>; // For modified
    item?: NormalizedItem; // For added/removed
}

export interface AnalysisResult {
    trackerId: TrackerId;
    runId: string;
    timestamp: number;
    type: AnalysisType;
    summary: string;
    triggered: boolean;
    footnote?: string;
}

export interface NotificationRecord {
    id: string;
    trackerId: TrackerId;
    runId: string;
    userId: UserId;
    timestamp: number;
    channel: string;
    reason: 'trigger' | 'scheduled';
    status: 'sent' | 'failed';
}

export interface TrackerRun {
    id: string;
    trackerId: TrackerId;
    timestamp: number;
    snapshotId: string;
    changeEvents: ChangeEvent[];
    analysisResult?: AnalysisResult;
    status: 'pending' | 'completed' | 'failed';
    error?: string;
}
