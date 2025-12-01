export type TrackerId = string;
export type UserId = string;

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
    | { type: 'googleNewsRssSearch'; querySpec: any; edition: string }
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

export interface ChangeEvent {
    type: 'added' | 'removed' | 'modified';
    itemId: string;
    diff?: Record<string, any>;
    item?: NormalizedItem;
}

export interface NormalizedItem {
    id: string;
    timestamp: number;
    data: Record<string, any>;
    fingerprint: string;
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
    timestamp: number;
    channel: string;
    status: 'sent' | 'failed' | 'pending';
    content?: string;
    error?: string;
}
