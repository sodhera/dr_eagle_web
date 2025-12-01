'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    fetchSystemPrompts,
    updateSystemPrompt,
    fetchTrackers,
    fetchLogSummary,
    fetchLogs,
    fetchModelConfig,
    fetchModelParameters,
    updateModelConfig,
} from '@/services/adminClient';
import type {
    SystemPromptsResponse,
    Tracker,
    LogEntry,
    LogSummaryResponse,
    ModelConfigResponse,
    ModelParametersRecord,
} from '@/types/admin';

const TRACKER_PAGE_SIZE = 10;
const LOG_PAGE_SIZE = 25;

type PromptDraft = {
    content: string;
    changelog: string;
};

type ModelDraft = {
    modelId: string;
    paramsText: string;
};

const emptyPromptDraft: PromptDraft = { content: '', changelog: '' };

export default function AdminPage() {
    const { user, loading } = useAuth();

    const [bootstrapping, setBootstrapping] = useState(true);
    const [globalError, setGlobalError] = useState<string | null>(null);

    const [systemPrompts, setSystemPrompts] = useState<SystemPromptsResponse | null>(null);
    const [promptDrafts, setPromptDrafts] = useState<{ main: PromptDraft; tracker: PromptDraft }>({
        main: { ...emptyPromptDraft },
        tracker: { ...emptyPromptDraft },
    });
    const [savingPrompt, setSavingPrompt] = useState<'main' | 'tracker' | null>(null);

    const [modelConfig, setModelConfig] = useState<ModelConfigResponse | null>(null);
    const [modelDrafts, setModelDrafts] = useState<{ main: ModelDraft; tracker: ModelDraft }>({
        main: { modelId: '', paramsText: '{}' },
        tracker: { modelId: '', paramsText: '{}' },
    });
    const [modelOptions, setModelOptions] = useState<ModelParametersRecord[]>([]);
    const [savingModelConfig, setSavingModelConfig] = useState(false);

    const [trackers, setTrackers] = useState<Tracker[]>([]);
    const [trackerPageToken, setTrackerPageToken] = useState<string | null>(null);
    const [trackerFilters, setTrackerFilters] = useState({
        userId: '',
        status: '',
        targetType: '',
        createdAfter: '',
        createdBefore: '',
    });
    const [trackersLoading, setTrackersLoading] = useState(false);

    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [logPageToken, setLogPageToken] = useState<string | null>(null);
    const [logFilters, setLogFilters] = useState({
        logType: '',
        level: '',
        userId: '',
        sessionId: '',
        trackerId: '',
        toolName: '',
        start: '',
        end: '',
    });
    const [logsLoading, setLogsLoading] = useState(false);
    const [logSummary, setLogSummary] = useState<LogSummaryResponse | null>(null);
    const [logSummaryLoading, setLogSummaryLoading] = useState(false);

    const handleError = (error: unknown, fallbackMessage = 'Something went wrong') => {
        if (error instanceof Error) {
            setGlobalError(error.message);
        } else {
            setGlobalError(fallbackMessage);
        }
    };

    const resetPromptDrafts = (prompts: SystemPromptsResponse) => {
        setPromptDrafts({
            main: { content: prompts.mainAgent.content, changelog: '' },
            tracker: { content: prompts.trackerAgent.content, changelog: '' },
        });
    };

    const resetModelDrafts = (config: ModelConfigResponse) => {
        setModelDrafts({
            main: {
                modelId: config.mainAgent.modelId,
                paramsText: JSON.stringify(config.mainAgent.params ?? {}, null, 2),
            },
            tracker: {
                modelId: config.trackerAgent.modelId,
                paramsText: JSON.stringify(config.trackerAgent.params ?? {}, null, 2),
            },
        });
    };

    const loadInitialData = useCallback(async () => {
        setBootstrapping(true);
        setGlobalError(null);
        try {
            const [
                promptResponse,
                modelConfigResponse,
                modelParamsResponse,
                trackerResponse,
                logSummaryResponse,
                logResponse,
            ] = await Promise.all([
                fetchSystemPrompts(),
                fetchModelConfig(),
                fetchModelParameters(),
                fetchTrackers({ limit: TRACKER_PAGE_SIZE }),
                fetchLogSummary(),
                fetchLogs({ limit: LOG_PAGE_SIZE }),
            ]);

            setSystemPrompts(promptResponse);
            resetPromptDrafts(promptResponse);

            setModelConfig(modelConfigResponse);
            resetModelDrafts(modelConfigResponse);
            setModelOptions(modelParamsResponse);

            setTrackers(trackerResponse.trackers);
            setTrackerPageToken(trackerResponse.nextPageToken ?? null);

            setLogSummary(logSummaryResponse);
            setLogs(logResponse.entries);
            setLogPageToken(logResponse.nextPageToken ?? null);
        } catch (error) {
            handleError(error, 'Failed to bootstrap admin data.');
        } finally {
            setBootstrapping(false);
        }
    }, []);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            setBootstrapping(false);
            setGlobalError('You must be signed in to view the admin console.');
            return;
        }
        loadInitialData();
    }, [loading, user, loadInitialData]);

    const handlePromptDraftChange = (agent: 'main' | 'tracker', field: keyof PromptDraft, value: string) => {
        setPromptDrafts((prev) => ({
            ...prev,
            [agent]: {
                ...prev[agent],
                [field]: value,
            },
        }));
    };

    const handlePromptSave = async (agent: 'main' | 'tracker') => {
        const draft = promptDrafts[agent];
        if (!draft.content.trim()) {
            setGlobalError('Prompt content cannot be empty.');
            return;
        }

        setSavingPrompt(agent);
        setGlobalError(null);
        try {
            await updateSystemPrompt(agent, {
                content: draft.content,
                changelog: draft.changelog || undefined,
            });
            const refreshed = await fetchSystemPrompts();
            setSystemPrompts(refreshed);
            resetPromptDrafts(refreshed);
        } catch (error) {
            handleError(error, 'Failed to save system prompt.');
        } finally {
            setSavingPrompt(null);
        }
    };

    const handleModelDraftChange = (agent: 'main' | 'tracker', field: keyof ModelDraft, value: string) => {
        setModelDrafts((prev) => ({
            ...prev,
            [agent]: {
                ...prev[agent],
                [field]: value,
            },
        }));
    };

    const parseParamsText = (raw: string): Record<string, unknown> => {
        if (!raw.trim()) return {};
        const parsed = JSON.parse(raw);
        if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
            throw new Error('Model parameters must be a JSON object.');
        }
        return parsed;
    };

    const handleModelConfigSave = async () => {
        setSavingModelConfig(true);
        setGlobalError(null);
        try {
            const payload: ModelConfigResponse = {
                mainAgent: {
                    modelId: modelDrafts.main.modelId,
                    params: parseParamsText(modelDrafts.main.paramsText),
                },
                trackerAgent: {
                    modelId: modelDrafts.tracker.modelId,
                    params: parseParamsText(modelDrafts.tracker.paramsText),
                },
            };
            const updated = await updateModelConfig(payload);
            setModelConfig(updated);
            resetModelDrafts(updated);
        } catch (error) {
            handleError(error, 'Failed to save model configuration.');
        } finally {
            setSavingModelConfig(false);
        }
    };

    const trackerQueryParams = useMemo(() => {
        const params: Parameters<typeof fetchTrackers>[0] = { limit: TRACKER_PAGE_SIZE };
        if (trackerFilters.userId.trim()) params.userId = trackerFilters.userId.trim();
        if (trackerFilters.status.trim()) params.status = trackerFilters.status.trim();
        if (trackerFilters.targetType.trim()) params.targetType = trackerFilters.targetType.trim();

        const toIso = (value: string) => {
            if (!value) return undefined;
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return undefined;
            return date.toISOString();
        };

        const createdAfterIso = toIso(trackerFilters.createdAfter);
        const createdBeforeIso = toIso(trackerFilters.createdBefore);
        if (createdAfterIso) params.createdAfter = createdAfterIso;
        if (createdBeforeIso) params.createdBefore = createdBeforeIso;
        return params;
    }, [trackerFilters]);

    const loadTrackers = useCallback(
        async (reset = false) => {
            setTrackersLoading(true);
            setGlobalError(null);
            try {
                const response = await fetchTrackers({
                    ...trackerQueryParams,
                    pageToken: !reset ? trackerPageToken ?? undefined : undefined,
                });
                setTrackers((prev) => (reset ? response.trackers : [...prev, ...response.trackers]));
                setTrackerPageToken(response.nextPageToken ?? null);
            } catch (error) {
                handleError(error, 'Failed to load trackers.');
            } finally {
                setTrackersLoading(false);
            }
        },
        [trackerQueryParams, trackerPageToken],
    );

    const logQueryParams = useMemo(() => {
        const params: Parameters<typeof fetchLogs>[0] = { limit: LOG_PAGE_SIZE };
        const cleanList = (value: string) =>
            value
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean);

        const logTypes = cleanList(logFilters.logType);
        if (logTypes.length > 0) params.logType = logTypes;
        if (logFilters.level.trim()) params.level = logFilters.level.trim();
        if (logFilters.userId.trim()) params.userId = logFilters.userId.trim();
        if (logFilters.sessionId.trim()) params.sessionId = logFilters.sessionId.trim();
        if (logFilters.trackerId.trim()) params.trackerId = logFilters.trackerId.trim();
        if (logFilters.toolName.trim()) params.toolName = logFilters.toolName.trim();

        const toIso = (value: string) => {
            if (!value) return undefined;
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return undefined;
            return date.toISOString();
        };

        const startIso = toIso(logFilters.start);
        const endIso = toIso(logFilters.end);
        if (startIso) params.start = startIso;
        if (endIso) params.end = endIso;
        return params;
    }, [logFilters]);

    const loadLogs = useCallback(
        async (reset = false) => {
            setLogsLoading(true);
            setGlobalError(null);
            try {
                const response = await fetchLogs({
                    ...logQueryParams,
                    pageToken: !reset ? logPageToken ?? undefined : undefined,
                });
                setLogs((prev) => (reset ? response.entries : [...prev, ...response.entries]));
                setLogPageToken(response.nextPageToken ?? null);
            } catch (error) {
                handleError(error, 'Failed to load logs.');
            } finally {
                setLogsLoading(false);
            }
        },
        [logQueryParams, logPageToken],
    );

    const refreshLogSummary = useCallback(async () => {
        setLogSummaryLoading(true);
        setGlobalError(null);
        try {
            const query = { ...logQueryParams };
            delete query.limit;
            delete query.pageToken;
            const summary = await fetchLogSummary(query);
            setLogSummary(summary);
        } catch (error) {
            handleError(error, 'Failed to load log summary.');
        } finally {
            setLogSummaryLoading(false);
        }
    }, [logQueryParams]);

    const handleTrackerFilterSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setTrackerPageToken(null);
        loadTrackers(true);
    };

    const handleLogFilterSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setLogPageToken(null);
        loadLogs(true);
        refreshLogSummary();
    };

    const renderTrackerRow = (tracker: Tracker) => (
        <tr key={tracker.id}>
            <td>{tracker.id}</td>
            <td>{tracker.title || 'Untitled'}</td>
            <td>{tracker.status}</td>
            <td>{tracker.mode}</td>
            <td>{tracker.visibility}</td>
            <td>{tracker.ownerId}</td>
            <td>{new Date(tracker.updatedAt).toLocaleString()}</td>
        </tr>
    );

    const renderLogRow = (entry: LogEntry, index: number) => (
        <tr key={`${entry.timestamp}-${entry.sessionId ?? index}`}>
            <td>{new Date(entry.timestamp).toLocaleString()}</td>
            <td>{entry.logType}</td>
            <td>{entry.level}</td>
            <td>{entry.userId || '—'}</td>
            <td>{entry.sessionId || '—'}</td>
            <td>{entry.trackerId || '—'}</td>
            <td>{entry.toolName || '—'}</td>
            <td className="log-message">{entry.message || '—'}</td>
        </tr>
    );

    if (loading || bootstrapping) {
        return (
            <div className="admin-page">
                <p>Loading admin console…</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="admin-page">
                <p>Please sign in to access the admin console.</p>
            </div>
        );
    }

    return (
        <div className="admin-page">
            {globalError && (
                <div className="error-banner">
                    {globalError}
                </div>
            )}

            <section className="panel">
                <header>
                    <h2>System Prompts</h2>
                    <p>Edit and deploy the core instructions used by the main and tracker agents.</p>
                </header>
                <div className="prompt-grid">
                    {(['main', 'tracker'] as const).map((agent) => {
                        const promptRecord = systemPrompts
                            ? agent === 'main'
                                ? systemPrompts.mainAgent
                                : systemPrompts.trackerAgent
                            : null;
                        return (
                            <div key={agent} className="prompt-card">
                                <h3>{agent === 'main' ? 'Main Agent Prompt' : 'Tracker Agent Prompt'}</h3>
                                {promptRecord && (
                                    <p className="meta">
                                        v{promptRecord.version} • Updated{' '}
                                        {promptRecord.updatedAt ? new Date(promptRecord.updatedAt).toLocaleString() : 'unknown'}
                                    </p>
                                )}
                                <textarea
                                    value={promptDrafts[agent].content}
                                    onChange={(event) => handlePromptDraftChange(agent, 'content', event.target.value)}
                                    rows={12}
                                />
                                <input
                                    type="text"
                                    placeholder="Changelog (optional)"
                                    value={promptDrafts[agent].changelog}
                                    onChange={(event) => handlePromptDraftChange(agent, 'changelog', event.target.value)}
                                />
                                <button
                                    onClick={() => handlePromptSave(agent)}
                                    disabled={savingPrompt === agent}
                                >
                                    {savingPrompt === agent ? 'Saving…' : 'Save Prompt'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="panel">
                <header>
                    <h2>Model Configuration</h2>
                    <p>Select models and tweak their parameters for each agent.</p>
                </header>
                <div className="model-grid">
                    {(['main', 'tracker'] as const).map((agent) => {
                        const configRecord = modelConfig
                            ? agent === 'main'
                                ? modelConfig.mainAgent
                                : modelConfig.trackerAgent
                            : null;
                        return (
                            <div key={agent} className="model-card">
                                <h3>{agent === 'main' ? 'Main Agent Model' : 'Tracker Agent Model'}</h3>
                                {configRecord && (
                                    <p className="meta">
                                        Last updated{' '}
                                        {configRecord.updatedAt ? new Date(configRecord.updatedAt).toLocaleString() : 'unknown'}
                                    </p>
                                )}
                                <label>
                                    <span>Model</span>
                                    <select
                                        value={modelDrafts[agent].modelId}
                                        onChange={(event) => handleModelDraftChange(agent, 'modelId', event.target.value)}
                                    >
                                        {modelOptions.length === 0 ? (
                                            <option value="" disabled>
                                                Loading models…
                                            </option>
                                        ) : (
                                            <>
                                                {!modelOptions.some((option) => option.modelId === modelDrafts[agent].modelId) &&
                                                    modelDrafts[agent].modelId && (
                                                        <option value={modelDrafts[agent].modelId}>
                                                            {modelDrafts[agent].modelId} (unlisted)
                                                        </option>
                                                    )}
                                                {modelOptions.map((option) => (
                                                    <option key={option.modelId} value={option.modelId}>
                                                        {option.displayName || option.modelId}
                                                    </option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                </label>
                                <label>
                                    <span>Parameters (JSON)</span>
                                    <textarea
                                        rows={8}
                                        value={modelDrafts[agent].paramsText}
                                        onChange={(event) => handleModelDraftChange(agent, 'paramsText', event.target.value)}
                                    />
                                </label>
                            </div>
                        );
                    })}
                </div>
                <button className="primary" onClick={handleModelConfigSave} disabled={savingModelConfig}>
                    {savingModelConfig ? 'Saving…' : 'Save Model Config'}
                </button>
            </section>

            <section className="panel">
                <header>
                    <h2>Trackers</h2>
                    <p>Search and audit active trackers.</p>
                </header>
                <form className="filters" onSubmit={handleTrackerFilterSubmit}>
                    <input
                        type="text"
                        placeholder="User ID"
                        value={trackerFilters.userId}
                        onChange={(event) => setTrackerFilters((prev) => ({ ...prev, userId: event.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Status"
                        value={trackerFilters.status}
                        onChange={(event) => setTrackerFilters((prev) => ({ ...prev, status: event.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Target Type"
                        value={trackerFilters.targetType}
                        onChange={(event) => setTrackerFilters((prev) => ({ ...prev, targetType: event.target.value }))}
                    />
                    <label>
                        From
                        <input
                            type="datetime-local"
                            value={trackerFilters.createdAfter}
                            onChange={(event) => setTrackerFilters((prev) => ({ ...prev, createdAfter: event.target.value }))}
                        />
                    </label>
                    <label>
                        To
                        <input
                            type="datetime-local"
                            value={trackerFilters.createdBefore}
                            onChange={(event) => setTrackerFilters((prev) => ({ ...prev, createdBefore: event.target.value }))}
                        />
                    </label>
                    <button type="submit" disabled={trackersLoading}>
                        {trackersLoading ? 'Filtering…' : 'Apply Filters'}
                    </button>
                </form>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Mode</th>
                                <th>Visibility</th>
                                <th>Owner</th>
                                <th>Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trackers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="empty">
                                        {trackersLoading ? 'Loading trackers…' : 'No trackers match these filters.'}
                                    </td>
                                </tr>
                            ) : (
                                trackers.map(renderTrackerRow)
                            )}
                        </tbody>
                    </table>
                </div>
                <button
                    onClick={() => loadTrackers(false)}
                    disabled={!trackerPageToken || trackersLoading}
                >
                    {trackersLoading ? 'Loading…' : trackerPageToken ? 'Load More' : 'No More Results'}
                </button>
            </section>

            <section className="panel">
                <header>
                    <h2>Logs</h2>
                    <p>Explore agent, tracker, and tool logs with flexible filters.</p>
                </header>
                <form className="filters" onSubmit={handleLogFilterSubmit}>
                    <input
                        type="text"
                        placeholder="Log Types (comma separated)"
                        value={logFilters.logType}
                        onChange={(event) => setLogFilters((prev) => ({ ...prev, logType: event.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Level"
                        value={logFilters.level}
                        onChange={(event) => setLogFilters((prev) => ({ ...prev, level: event.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="User ID"
                        value={logFilters.userId}
                        onChange={(event) => setLogFilters((prev) => ({ ...prev, userId: event.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Session ID"
                        value={logFilters.sessionId}
                        onChange={(event) => setLogFilters((prev) => ({ ...prev, sessionId: event.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Tracker ID"
                        value={logFilters.trackerId}
                        onChange={(event) => setLogFilters((prev) => ({ ...prev, trackerId: event.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Tool Name"
                        value={logFilters.toolName}
                        onChange={(event) => setLogFilters((prev) => ({ ...prev, toolName: event.target.value }))}
                    />
                    <label>
                        Start
                        <input
                            type="datetime-local"
                            value={logFilters.start}
                            onChange={(event) => setLogFilters((prev) => ({ ...prev, start: event.target.value }))}
                        />
                    </label>
                    <label>
                        End
                        <input
                            type="datetime-local"
                            value={logFilters.end}
                            onChange={(event) => setLogFilters((prev) => ({ ...prev, end: event.target.value }))}
                        />
                    </label>
                    <button type="submit" disabled={logsLoading}>
                        {logsLoading ? 'Filtering…' : 'Apply Filters'}
                    </button>
                </form>

                <div className="log-summary">
                    <header>
                        <h3>Summary</h3>
                        <button type="button" onClick={refreshLogSummary} disabled={logSummaryLoading}>
                            {logSummaryLoading ? 'Refreshing…' : 'Refresh'}
                        </button>
                    </header>
                    {logSummary ? (
                        <div className="summary-grid">
                            <div>
                                <strong>Log Types</strong>
                                <ul>
                                    {Object.entries(logSummary.logTypeCounts).map(([type, count]) => (
                                        <li key={type}>
                                            {type}: {count}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <strong>Recent Users</strong>
                                <ul>
                                    {logSummary.recentUsers.length > 0 ? (
                                        logSummary.recentUsers.map((entry) => (
                                            <li key={entry.userId}>
                                                {entry.userId} ({entry.count})
                                            </li>
                                        ))
                                    ) : (
                                        <li>No data</li>
                                    )}
                                </ul>
                            </div>
                            <div>
                                <strong>Recent Trackers</strong>
                                <ul>
                                    {logSummary.recentTrackers.length > 0 ? (
                                        logSummary.recentTrackers.map((entry) => (
                                            <li key={entry.trackerId}>
                                                {entry.trackerId} ({entry.count})
                                            </li>
                                        ))
                                    ) : (
                                        <li>No data</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <p>No summary data loaded.</p>
                    )}
                </div>

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Type</th>
                                <th>Level</th>
                                <th>User</th>
                                <th>Session</th>
                                <th>Tracker</th>
                                <th>Tool</th>
                                <th>Message</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="empty">
                                        {logsLoading ? 'Loading logs…' : 'No logs match these filters.'}
                                    </td>
                                </tr>
                            ) : (
                                logs.map(renderLogRow)
                            )}
                        </tbody>
                    </table>
                </div>
                <button
                    onClick={() => loadLogs(false)}
                    disabled={!logPageToken || logsLoading}
                >
                    {logsLoading ? 'Loading…' : logPageToken ? 'Load More' : 'No More Results'}
                </button>
            </section>

            <style jsx>{`
                .admin-page {
                    padding: 32px;
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                    background: var(--bg-primary, #f7f7f9);
                    min-height: 100vh;
                }

                .panel {
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    box-shadow: 0 20px 130px rgba(15, 15, 35, 0.09);
                    border: 1px solid rgba(10, 10, 25, 0.08);
                }

                .error-banner {
                    padding: 12px 16px;
                    border-radius: 10px;
                    background: rgba(255, 82, 82, 0.1);
                    color: #b30021;
                    border: 1px solid rgba(255, 82, 82, 0.3);
                }

                .panel header {
                    margin-bottom: 16px;
                }

                .prompt-grid,
                .model-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 24px;
                }

                .prompt-card,
                .model-card {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    border: 1px solid rgba(15, 15, 45, 0.08);
                    border-radius: 12px;
                    padding: 16px;
                    background: rgba(251, 251, 255, 0.8);
                }

                textarea {
                    width: 100%;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid rgba(15, 15, 35, 0.15);
                    font-family: var(--font-sans, 'Inter', sans-serif);
                }

                .meta {
                    font-size: 0.85rem;
                    color: #666;
                    margin: 0;
                }

                input[type='text'],
                select,
                input[type='datetime-local'] {
                    padding: 10px 12px;
                    border-radius: 8px;
                    border: 1px solid rgba(15, 15, 35, 0.15);
                    font-size: 0.95rem;
                }

                button {
                    align-self: flex-start;
                    padding: 10px 16px;
                    border-radius: 8px;
                    border: none;
                    background: #111;
                    color: white;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }

                button.primary {
                    margin-top: 16px;
                }

                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .filters {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 12px;
                    margin-bottom: 16px;
                    align-items: flex-end;
                }

                .filters label {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    font-size: 0.85rem;
                    color: #444;
                }

                .table-wrapper {
                    overflow-x: auto;
                    margin-top: 16px;
                    border: 1px solid rgba(10, 10, 25, 0.08);
                    border-radius: 12px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.9rem;
                }

                th,
                td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid rgba(10, 10, 25, 0.08);
                }

                th {
                    font-weight: 600;
                    color: #444;
                }

                .empty {
                    text-align: center;
                    padding: 24px;
                    color: #777;
                }

                .log-summary {
                    margin-bottom: 16px;
                    padding: 16px;
                    border: 1px solid rgba(15, 15, 45, 0.08);
                    border-radius: 12px;
                    background: rgba(246, 246, 252, 0.8);
                }

                .log-summary header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 16px;
                }

                .summary-grid ul {
                    margin: 0;
                    padding-left: 18px;
                }

                .log-message {
                    max-width: 360px;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
            `}</style>
        </div>
    );
}
