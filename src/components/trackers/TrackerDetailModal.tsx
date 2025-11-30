import React from 'react';
import { Tracker } from '@/types/tracking';

interface TrackerDetailModalProps {
    tracker: Tracker;
    onClose: () => void;
}

export default function TrackerDetailModal({ tracker, onClose }: TrackerDetailModalProps) {
    const isTrumpTracker = tracker.target.type === 'polymarketMarket' && (tracker.target as any).marketId === 'trump-gov-shutdown-dec';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[var(--bg-secondary)] w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-primary)]">
                    <div>
                        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                            {isTrumpTracker ? "Will Trump close government in Dec?" : "Tracker Details"}
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            ID: {tracker.id} • {tracker.mode} mode
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-secondary)]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Main Chart / Info */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-[var(--bg-primary)] p-6 rounded-xl border border-[var(--border-subtle)]">
                                <h3 className="text-lg font-medium mb-4 text-[var(--text-primary)]">Probability History</h3>
                                <div className="h-64 flex items-end gap-2 w-full">
                                    {/* Mock Chart */}
                                    {Array.from({ length: 30 }).map((_, i) => {
                                        const h = 30 + Math.random() * 40;
                                        return (
                                            <div
                                                key={i}
                                                className="flex-1 bg-[var(--accent-primary)] opacity-80 hover:opacity-100 transition-opacity rounded-t"
                                                style={{ height: `${h}%` }}
                                            ></div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-[var(--text-secondary)]">
                                    <span>30 days ago</span>
                                    <span>Today</span>
                                </div>
                            </div>

                            <div className="bg-[var(--bg-primary)] p-6 rounded-xl border border-[var(--border-subtle)]">
                                <h3 className="text-lg font-medium mb-4 text-[var(--text-primary)]">Recent Analysis</h3>
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex gap-4 p-3 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                                            <div className="w-2 h-2 mt-2 rounded-full bg-[var(--accent-primary)] shrink-0"></div>
                                            <div>
                                                <p className="text-sm text-[var(--text-primary)]">
                                                    {i === 1 ? "Probability increased by 2% following recent statements on budget negotiations." :
                                                        i === 2 ? "No significant movement detected in overnight trading." :
                                                            "Market sentiment remains mixed with high volatility expected next week."}
                                                </p>
                                                <span className="text-xs text-[var(--text-secondary)]">{i * 4} hours ago</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Widgets */}
                        <div className="space-y-6">
                            {/* Current Probability Widget */}
                            <div className="bg-[var(--bg-primary)] p-6 rounded-xl border border-[var(--border-subtle)] flex flex-col items-center justify-center text-center">
                                <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Current Probability</h3>
                                <div className="text-5xl font-bold text-[var(--text-primary)] mb-2">42%</div>
                                <div className="text-sm text-green-500 flex items-center gap-1">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 15l-6-6-6 6" />
                                    </svg>
                                    +2.4% (24h)
                                </div>
                            </div>

                            {/* Related News Widget */}
                            <div className="bg-[var(--bg-primary)] p-6 rounded-xl border border-[var(--border-subtle)]">
                                <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4">Related News</h3>
                                <ul className="space-y-3">
                                    {[
                                        "Senate leaders optimistic about deal",
                                        "House Speaker comments on budget deadline",
                                        "Federal agencies prepare for potential shutdown"
                                    ].map((news, i) => (
                                        <li key={i} className="text-sm text-[var(--text-primary)] hover:text-[var(--accent-primary)] cursor-pointer truncate">
                                            • {news}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Actions Widget */}
                            <div className="bg-[var(--bg-primary)] p-6 rounded-xl border border-[var(--border-subtle)]">
                                <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4">Actions</h3>
                                <div className="space-y-2">
                                    <button className="w-full py-2 px-4 bg-[var(--accent-primary)] text-white rounded-lg text-sm hover:bg-[var(--accent-hover)] transition-colors">
                                        Run Analysis Now
                                    </button>
                                    <button className="w-full py-2 px-4 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg text-sm hover:bg-[var(--bg-secondary)] transition-colors border border-[var(--border-subtle)]">
                                        Edit Tracker
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
