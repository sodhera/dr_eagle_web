import React, { useEffect, useState } from 'react';
import { Tracker, TrackerRun, NotificationRecord } from '@/types/tracking';
import { getTrackerRuns, getTrackerNotifications, deleteTracker } from '@/services/trackerClient';

interface TrackerDetailModalProps {
    tracker: Tracker;
    onClose: () => void;
    onDelete?: (trackerId: string) => void;
}

export default function TrackerDetailModal({ tracker, onClose, onDelete }: TrackerDetailModalProps) {
    const [runs, setRuns] = useState<TrackerRun[]>([]);
    const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    const isTrumpTracker = tracker.target.type === 'polymarketMarket' && (tracker.target as any).marketId === 'trump-gov-shutdown-dec';

    useEffect(() => {
        const loadData = async () => {
            try {
                const [runsData, notifsData] = await Promise.all([
                    getTrackerRuns(tracker.id),
                    getTrackerNotifications(tracker.id)
                ]);
                setRuns(runsData);
                setNotifications(notifsData);
            } catch (error) {
                console.error("Failed to load tracker details", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [tracker.id]);

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this tracker?")) return;
        setDeleting(true);
        try {
            await deleteTracker(tracker.id);
            onDelete?.(tracker.id);
            onClose();
        } catch (error) {
            console.error("Failed to delete tracker", error);
            alert("Failed to delete tracker");
            setDeleting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">
                            {isTrumpTracker ? "Will Trump close government in Dec?" : "Tracker Details"}
                        </h2>
                        <p className="modal-subtitle">
                            ID: {tracker.id} • {tracker.mode} mode
                        </p>
                    </div>
                    <button onClick={onClose} className="close-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="modal-body">
                    <div className="modal-grid">
                        {/* Main Chart / Info */}
                        <div className="main-column">

                            {/* Runs History */}
                            <div className="card">
                                <h3 className="card-title">Recent Runs</h3>
                                {loading ? (
                                    <div className="loading-text">Loading runs...</div>
                                ) : runs.length === 0 ? (
                                    <div className="empty-text">No runs recorded.</div>
                                ) : (
                                    <div className="list-container">
                                        {runs.map(run => (
                                            <div key={run.id} className="list-item">
                                                <div className={`status-dot ${run.status === 'completed' ? 'completed' : 'pending'}`}></div>
                                                <div>
                                                    <p className="item-title">
                                                        {run.analysisResult?.summary || "Run completed"}
                                                    </p>
                                                    <span className="item-subtitle">
                                                        {new Date(run.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Notifications History */}
                            <div className="card">
                                <h3 className="card-title">Notification History</h3>
                                {loading ? (
                                    <div className="loading-text">Loading notifications...</div>
                                ) : notifications.length === 0 ? (
                                    <div className="empty-text">No notifications recorded.</div>
                                ) : (
                                    <div className="list-container">
                                        {notifications.map(notif => (
                                            <div key={notif.id} className="list-item">
                                                <div className="channel-badge">
                                                    {notif.channel}
                                                </div>
                                                <div>
                                                    <p className="item-title">
                                                        {notif.status}
                                                    </p>
                                                    <span className="item-subtitle">
                                                        {new Date(notif.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar Widgets */}
                        <div className="sidebar-column">
                            {/* Actions Widget */}
                            <div className="card">
                                <h3 className="widget-title">Actions</h3>
                                <div className="actions-stack">
                                    <button className="action-btn primary">
                                        Run Analysis Now
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="action-btn danger"
                                    >
                                        {deleting ? 'Deleting...' : 'Delete Tracker'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 50;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                }

                .modal-content {
                    background-color: var(--bg-secondary);
                    width: 100%;
                    max-width: 56rem; /* max-w-4xl */
                    height: 80vh;
                    border-radius: var(--radius-xl);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--border-subtle);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: var(--bg-primary);
                }

                .modal-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .modal-subtitle {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    margin-top: 0.25rem;
                }

                .close-btn {
                    padding: 0.5rem;
                    border-radius: 9999px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: var(--text-primary);
                    transition: background-color 0.2s;
                }

                .close-btn:hover {
                    background-color: var(--bg-tertiary);
                }

                .modal-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.5rem;
                    background-color: var(--bg-secondary);
                }

                .modal-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                }

                @media (min-width: 768px) {
                    .modal-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                    .main-column {
                        grid-column: span 2;
                    }
                }

                .main-column {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .sidebar-column {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .card {
                    background-color: var(--bg-primary);
                    padding: 1.5rem;
                    border-radius: var(--radius-xl); /* rounded-xl */
                    border: 1px solid var(--border-subtle);
                }

                .card-title {
                    font-size: 1.125rem;
                    font-weight: 500;
                    margin-bottom: 1rem;
                    color: var(--text-primary);
                }

                .widget-title {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 1rem;
                }

                .loading-text, .empty-text {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .list-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    max-height: 15rem; /* max-h-60 */
                    overflow-y: auto;
                }

                .list-item {
                    display: flex;
                    gap: 1rem;
                    padding: 0.75rem; /* p-3 */
                    border-radius: var(--radius-lg); /* rounded-lg */
                    transition: background-color 0.2s;
                    border: 1px solid var(--border-subtle);
                }

                .list-item:hover {
                    background-color: var(--bg-tertiary);
                }

                .status-dot {
                    width: 0.5rem; /* w-2 */
                    height: 0.5rem; /* h-2 */
                    margin-top: 0.5rem; /* mt-2 */
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .status-dot.completed {
                    background-color: #22c55e; /* bg-green-500 */
                }

                .status-dot.pending { /* Changed from yellow to pending for clarity */
                    background-color: #eab308; /* bg-yellow-500 */
                }

                .item-title {
                    font-size: 0.875rem; /* text-sm */
                    color: var(--text-primary);
                }

                .item-subtitle {
                    font-size: 0.75rem; /* text-xs */
                    color: var(--text-secondary);
                }

                .channel-badge {
                    font-size: 0.75rem; /* text-xs */
                    font-family: monospace; /* font-mono */
                    color: var(--text-secondary);
                    background-color: var(--bg-tertiary);
                    padding: 0.25rem 0.5rem; /* px-2 py-1 */
                    border-radius: var(--radius-sm); /* rounded */
                    height: fit-content;
                }

                .actions-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem; /* space-y-2 */
                }

                .action-btn {
                    width: 100%;
                    padding: 0.5rem 1rem; /* py-2 px-4 */
                    border-radius: var(--radius-lg); /* rounded-lg */
                    font-size: 0.875rem; /* text-sm */
                    cursor: pointer;
                    transition: all 0.2s; /* transition-colors */
                    border: none;
                }

                .action-btn.primary {
                    background-color: var(--accent-primary);
                    color: white;
                }

                .action-btn.primary:hover {
                    background-color: var(--accent-hover);
                }

                .action-btn.danger {
                    background-color: rgba(239, 68, 68, 0.1); /* bg-red-500/10 */
                    color: #ef4444; /* text-red-500 */
                    border: 1px solid rgba(239, 68, 68, 0.2); /* border border-red-500/20 */
                }

                .action-btn.danger:hover {
                    background-color: rgba(239, 68, 68, 0.2); /* hover:bg-red-500/20 */
                }

                .action-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}

