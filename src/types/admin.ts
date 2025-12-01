export interface SystemPromptRecord {
    id: string;
    agent: 'main' | 'tracker';
    version: number;
    content: string;
    changelog?: string;
    updatedAt?: number;
    updatedBy?: string;
}

export interface SystemPromptsResponse {
    mainAgent: SystemPromptRecord;
    trackerAgent: SystemPromptRecord;
}

export interface Tracker {
    id: string;
    ownerId: string;
    title: string;
    target: Record<string, unknown>;
    mode: string;
    status: string;
    visibility: string;
    schedule?: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
}

export interface TrackerListResponse {
    trackers: Tracker[];
    nextPageToken?: string;
}

export interface LogEntry {
    id?: string;
    timestamp: number;
    logType: string;
    level: string;
    userId?: string;
    sessionId?: string;
    trackerId?: string;
    toolName?: string;
    message?: string;
    metadata?: Record<string, unknown>;
}

export interface LogListResponse {
    entries: LogEntry[];
    nextPageToken?: string;
}

export interface LogSummaryResponse {
    logTypeCounts: Record<string, number>;
    recentUsers: { userId: string; count: number }[];
    recentTrackers: { trackerId: string; count: number }[];
}

export interface ModelConfigRecord {
    modelId: string;
    params: Record<string, unknown>;
    updatedAt?: number;
    updatedBy?: string;
}

export interface ModelConfigResponse {
    mainAgent: ModelConfigRecord;
    trackerAgent: ModelConfigRecord;
}

export interface ModelParameterDefinition {
    name: string;
    type: string;
    min?: number;
    max?: number;
    step?: number;
    default?: number | string | boolean;
}

export interface ModelParametersRecord {
    modelId: string;
    displayName: string;
    description?: string;
    allowedParams: ModelParameterDefinition[];
}
