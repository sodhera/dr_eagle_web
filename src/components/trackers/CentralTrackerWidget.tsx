import React from 'react';
import { Tracker } from '@/types/tracking';

interface CentralTrackerWidgetProps {
    tracker: Tracker | null;
}

export default function CentralTrackerWidget({ tracker }: CentralTrackerWidgetProps) {
    if (!tracker) {
        return (
            <div className="empty-widget">
                Select a tracker to view details
            </div>
        );
    }

    return (
        <div className="widget-container group">
            <div className="bg-icon">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
            </div>

            <div className="content">
                <div className="header">
                    <div className="icon-circle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="title">Active Monitoring</h2>
                        <p className="subtitle">Real-time analysis running</p>
                    </div>
                </div>

                <div className="stats-grid">
                    <div>
                        <div className="stat-label">Target</div>
                        <div className="stat-value truncate">
                            {tracker.target.type === 'polymarketMarket' ? 'Polymarket Prediction' :
                                tracker.target.type === 'googleNewsRssSearch' ? 'News Feed' : 'HTTP Source'}
                        </div>
                    </div>
                    <div>
                        <div className="stat-label">Status</div>
                        <div className="status-row">
                            <span className="pulse-dot"></span>
                            <span className="stat-value capitalize">{tracker.status}</span>
                        </div>
                    </div>
                    <div>
                        <div className="stat-label">Mode</div>
                        <div className="stat-value capitalize">{tracker.mode}</div>
                    </div>
                </div>

                <div className="chart-card">
                    <div className="chart-header">
                        <span className="chart-title">Activity (24h)</span>
                        <span className="chart-subtitle">High Activity</span>
                    </div>
                    {/* Mock Chart */}
                    <div className="chart-bars">
                        {[40, 65, 45, 80, 55, 70, 45, 60, 75, 50, 85, 65, 70, 55, 80, 60, 75, 50, 90, 65, 80, 70, 60, 95].map((h, i) => (
                            <div
                                key={i}
                                className="chart-bar"
                                style={{ height: `${h}%` }}
                            ></div>
                        ))}
                    </div>
                </div>

                <div className="info-card">
                    <div className="chart-header">
                        <span className="chart-title">Latest Analysis</span>
                        <span className="chart-subtitle">Just now</span>
                    </div>
                    <p className="info-text">
                        System is actively monitoring data points. No critical anomalies detected in the last interval.
                        Confidence level remains high at 98%.
                    </p>
                </div>
            </div>

            <style jsx>{`
                .empty-widget {
                    width: 100%;
                    height: 16rem;
                    background-color: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-xl);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary);
                }

                .widget-container {
                    width: 100%;
                    background-color: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-xl);
                    padding: 1.5rem;
                    position: relative;
                    overflow: hidden;
                }

                .bg-icon {
                    position: absolute;
                    top: 0;
                    right: 0;
                    padding: 1rem;
                    opacity: 0.1;
                    transition: opacity 0.3s;
                    pointer-events: none;
                }

                .widget-container:hover .bg-icon {
                    opacity: 0.2;
                }

                .content {
                    position: relative;
                    z-index: 10;
                }

                .header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }

                .icon-circle {
                    width: 2.5rem;
                    height: 2.5rem;
                    border-radius: 50%;
                    background-color: var(--accent-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .subtitle {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                }

                .stat-label {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.25rem;
                }

                .stat-value {
                    color: var(--text-primary);
                    font-weight: 500;
                }

                .truncate {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .status-row {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .pulse-dot {
                    width: 0.5rem;
                    height: 0.5rem;
                    border-radius: 50%;
                    background-color: #22c55e;
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }

                .capitalize {
                    text-transform: capitalize;
                }

                .chart-card, .info-card {
                    background-color: var(--bg-tertiary);
                    border-radius: var(--radius-lg);
                    padding: 1rem;
                    border: 1px solid var(--border-subtle);
                }

                .chart-card {
                    margin-bottom: 1rem;
                }

                .chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }

                .chart-title {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .chart-subtitle {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .chart-bars {
                    height: 6rem;
                    width: 100%;
                    display: flex;
                    align-items: flex-end;
                    gap: 0.25rem;
                }

                .chart-bar {
                    flex: 1;
                    background-color: var(--accent-primary);
                    opacity: 0.2;
                    transition: opacity 0.2s;
                    border-top-left-radius: 2px;
                    border-top-right-radius: 2px;
                }

                .chart-bar:hover {
                    opacity: 1;
                }

                .info-text {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    line-height: 1.625;
                }
            `}</style>
        </div>
    );
}
