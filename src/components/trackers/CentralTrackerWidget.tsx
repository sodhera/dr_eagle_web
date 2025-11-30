import React from 'react';
import { Tracker } from '@/types/tracking';

interface CentralTrackerWidgetProps {
    tracker: Tracker | null;
}

export default function CentralTrackerWidget({ tracker }: CentralTrackerWidgetProps) {
    if (!tracker) {
        return (
            <div className="w-full h-64 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-center text-[var(--text-secondary)]">
                Select a tracker to view details
            </div>
        );
    }

    return (
        <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Active Monitoring</h2>
                        <p className="text-sm text-[var(--text-secondary)]">Real-time analysis running</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-6">
                    <div>
                        <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Target</div>
                        <div className="text-[var(--text-primary)] font-medium truncate">
                            {tracker.target.type === 'polymarketMarket' ? 'Polymarket Prediction' :
                                tracker.target.type === 'googleNewsRssSearch' ? 'News Feed' : 'HTTP Source'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Status</div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[var(--text-primary)] font-medium capitalize">{tracker.status}</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Mode</div>
                        <div className="text-[var(--text-primary)] font-medium capitalize">{tracker.mode}</div>
                    </div>
                </div>

                <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 border border-[var(--border-subtle)] mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">Activity (24h)</span>
                        <span className="text-xs text-[var(--text-secondary)]">High Activity</span>
                    </div>
                    {/* Mock Chart */}
                    <div className="h-24 w-full flex items-end gap-1">
                        {[40, 65, 45, 80, 55, 70, 45, 60, 75, 50, 85, 65, 70, 55, 80, 60, 75, 50, 90, 65, 80, 70, 60, 95].map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-[var(--accent-primary)] opacity-20 hover:opacity-100 transition-opacity rounded-t-sm"
                                style={{ height: `${h}%` }}
                            ></div>
                        ))}
                    </div>
                </div>

                <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 border border-[var(--border-subtle)]">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">Latest Analysis</span>
                        <span className="text-xs text-[var(--text-secondary)]">Just now</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        System is actively monitoring data points. No critical anomalies detected in the last interval.
                        Confidence level remains high at 98%.
                    </p>
                </div>
            </div>
        </div>
    );
}
