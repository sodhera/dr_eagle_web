import React, { useState } from 'react';
import { Tracker, TrackerRun } from '@/types/tracking';
import { runTracker } from '@/services/trackerClient';

interface TrackerCardProps {
    tracker: Tracker;
    onClick?: (tracker: Tracker) => void;
}

export default function TrackerCard({ tracker, onClick }: TrackerCardProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [lastRun, setLastRun] = useState<TrackerRun | null>(null);

    const handleRun = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsRunning(true);
        try {
            const result = await runTracker(tracker.id);
            setLastRun(result);
        } catch (error) {
            console.error("Failed to run tracker", error);
        } finally {
            setIsRunning(false);
        }
    };

    const getTargetLabel = (target: any) => {
        if (target.type === 'polymarketMarket') {
            if (target.marketId === 'trump-gov-shutdown-dec') return "Will Trump close government in Dec?";
            return `Polymarket: ${target.marketId}`;
        }
        if (target.type === 'googleNewsRssSearch') return `News: ${target.querySpec.q}`;
        if (target.type === 'httpSource') return `HTTP: ${target.url}`;
        return target.type;
    };

    const isTrumpTracker = tracker.target.type === 'polymarketMarket' && (tracker.target as any).marketId === 'trump-gov-shutdown-dec';

    return (
        <div
            onClick={() => onClick?.(tracker)}
            className={`bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg p-4 flex flex-col gap-3 transition-all cursor-pointer relative overflow-hidden ${isTrumpTracker ? 'ring-2 ring-[var(--accent-primary)] shadow-lg' : 'hover:border-[var(--accent-primary)]'}`}
        >
            {isTrumpTracker && (
                <div className="absolute top-2 right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </div>
            )}

            <div className="flex justify-between items-start pr-4">
                <div>
                    <h3 className="text-[var(--text-primary)] font-medium text-sm line-clamp-2">{getTargetLabel(tracker.target)}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${tracker.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        {tracker.status}
                    </span>
                </div>
                <div className="text-[var(--text-secondary)] text-xs">
                    {tracker.mode}
                </div>
            </div>

            <div className="text-xs text-[var(--text-secondary)]">
                Analysis: {tracker.analysis.type === 'ai' ? 'AI Agent' : 'Python Script'}
            </div>

            {/* Mock Sparkline */}
            <div className="h-8 w-full flex items-end gap-0.5 my-2 opacity-50">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded-t-[1px] ${isTrumpTracker ? 'bg-red-500' : 'bg-[var(--text-secondary)]'}`}
                        style={{ height: `${Math.random() * 60 + 20}%` }}
                    ></div>
                ))}
            </div>

            {lastRun && (
                <div className="bg-[var(--bg-tertiary)] p-2 rounded text-xs mt-2">
                    <div className="font-medium text-[var(--text-primary)] mb-1">Last Run Result:</div>
                    <div className={lastRun.analysisResult?.triggered ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}>
                        {lastRun.analysisResult?.summary || 'No summary'}
                    </div>
                </div>
            )}

            <div className="mt-auto pt-2">
                <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="w-full py-1.5 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs rounded transition-colors disabled:opacity-50"
                >
                    {isRunning ? 'Running...' : 'Run Now'}
                </button>
            </div>
        </div>
    );
}
