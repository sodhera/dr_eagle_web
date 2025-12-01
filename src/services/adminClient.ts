import { getMcpToken } from './mcpAuth';
import type {
    SystemPromptsResponse,
    SystemPromptRecord,
    TrackerListResponse,
    LogListResponse,
    LogSummaryResponse,
    ModelConfigResponse,
    ModelConfigRecord,
    ModelParametersRecord,
} from '@/types/admin';

const ADMIN_BASE_URL = 'https://us-central1-audit-3a7ec.cloudfunctions.net';

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await getMcpToken();
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    headers.set('Accept', 'application/json');

    const response = await fetch(`${ADMIN_BASE_URL}${path}`, {
        ...init,
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Admin request failed (${response.status}): ${errorText}`);
    }

    return response;
}

function toQueryString(params: Record<string, string | number | undefined | null | string[]>): string {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
            value.forEach((val) => query.append(key, val));
        } else {
            query.append(key, String(value));
        }
    });
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
}

export async function fetchSystemPrompts(): Promise<SystemPromptsResponse> {
    const response = await adminFetch('/admin/system-prompts');
    return response.json();
}

export async function updateSystemPrompt(agent: 'main' | 'tracker', payload: { content: string; changelog?: string }): Promise<SystemPromptRecord> {
    const response = await adminFetch(`/admin/system-prompts/${agent}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return response.json();
}

export interface TrackerQuery {
    userId?: string;
    status?: string;
    targetType?: string;
    createdAfter?: string;
    createdBefore?: string;
    limit?: number;
    pageToken?: string;
}

export async function fetchTrackers(params: TrackerQuery = {}): Promise<TrackerListResponse> {
    const queryString = toQueryString(params);
    const response = await adminFetch(`/admin/trackers${queryString}`);
    return response.json();
}

export interface LogQuery {
    logType?: string | string[];
    userId?: string;
    sessionId?: string;
    trackerId?: string;
    toolName?: string;
    level?: string;
    start?: string;
    end?: string;
    limit?: number;
    pageToken?: string;
}

export async function fetchLogs(params: LogQuery = {}): Promise<LogListResponse> {
    const queryString = toQueryString({
        ...params,
        logType: Array.isArray(params.logType) ? params.logType : params.logType ? [params.logType] : undefined,
    });
    const response = await adminFetch(`/admin/logs${queryString}`);
    return response.json();
}

export async function fetchLogSummary(params: LogQuery = {}): Promise<LogSummaryResponse> {
    const queryString = toQueryString({
        ...params,
        logType: Array.isArray(params.logType) ? params.logType : params.logType ? [params.logType] : undefined,
    });
    const response = await adminFetch(`/admin/logs/summary${queryString}`);
    return response.json();
}

export async function fetchModelConfig(): Promise<ModelConfigResponse> {
    const response = await adminFetch('/admin/model-config');
    return response.json();
}

export async function updateModelConfig(payload: ModelConfigResponse): Promise<ModelConfigResponse> {
    const response = await adminFetch('/admin/model-config', {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return response.json();
}

export async function fetchModelParameters(): Promise<ModelParametersRecord[]> {
    const response = await adminFetch('/admin/model-parameters');
    return response.json();
}
