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
            className={`tracker-card ${isTrumpTracker ? 'trump-card' : ''}`}
        >
            {isTrumpTracker && (
                <div className="ping-container">
                    <span className="ping-animation"></span>
                    <span className="ping-dot"></span>
                </div>
            )}

            <div className="card-header">
                <div>
                    <h3 className="card-title">{getTargetLabel(tracker.target)}</h3>
                    <span className={`status-badge ${tracker.status}`}>
                        {tracker.status}
                    </span>
                </div>
                <div className="mode-label">
                    {tracker.mode}
                </div>
            </div>

            <div className="analysis-type">
                Analysis: {tracker.analysis.type === 'ai' ? 'AI Agent' : 'Python Script'}
            </div>

            {/* Mock Sparkline */}
            <div className="sparkline">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className="sparkline-bar"
                        style={{
                            height: `${Math.random() * 60 + 20}%`,
                            backgroundColor: isTrumpTracker ? '#ef4444' : 'var(--text-secondary)'
                        }}
                    ></div>
                ))}
            </div>

            {lastRun && (
                <div className="last-run">
                    <div className="last-run-label">Last Run Result:</div>
                    <div className={lastRun.analysisResult?.triggered ? 'result-triggered' : 'result-normal'}>
                        {lastRun.analysisResult?.summary || 'No summary'}
                    </div>
                </div>
            )}

            <div className="card-actions">
                <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="run-btn"
                >
                    {isRunning ? 'Running...' : 'Run Now'}
                </button>
            </div>

            <style jsx>{`
                .tracker-card {
                    background-color: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-lg);
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    transition: all 0.2s;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                }

                .tracker-card:hover {
                    border-color: var(--accent-primary);
                }

                .trump-card {
                    box-shadow: 0 0 0 2px var(--accent-primary), 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                }

                .ping-container {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    display: flex;
                    height: 0.75rem;
                    width: 0.75rem;
                }

                .ping-animation {
                    animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
                    position: absolute;
                    display: inline-flex;
                    height: 100%;
                    width: 100%;
                    border-radius: 50%;
                    background-color: #f87171;
                    opacity: 0.75;
                }

                .ping-dot {
                    position: relative;
                    display: inline-flex;
                    border-radius: 50%;
                    height: 0.75rem;
                    width: 0.75rem;
                    background-color: #ef4444;
                }

                @keyframes ping {
                    75%, 100% {
                        transform: scale(2);
                        opacity: 0;
                    }
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding-right: 1rem;
                }

                .card-title {
                    color: var(--text-primary);
                    font-weight: 500;
                    font-size: 0.875rem;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .status-badge {
                    font-size: 0.75rem;
                    padding: 0.125rem 0.5rem;
                    border-radius: 9999px;
                    margin-top: 0.25rem;
                    display: inline-block;
                }

                .status-badge.active {
                    background-color: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                }

                .status-badge.paused {
                    background-color: rgba(234, 179, 8, 0.1);
                    color: #eab308;
                }

                .mode-label {
                    color: var(--text-secondary);
                    font-size: 0.75rem;
                }

                .analysis-type {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .sparkline {
                    height: 2rem;
                    width: 100%;
                    display: flex;
                    align-items: flex-end;
                    gap: 2px;
                    margin: 0.5rem 0;
                    opacity: 0.5;
                }

                .sparkline-bar {
                    flex: 1;
                    border-top-left-radius: 1px;
                    border-top-right-radius: 1px;
                }

                .last-run {
                    background-color: var(--bg-tertiary);
                    padding: 0.5rem;
                    border-radius: var(--radius-sm);
                    font-size: 0.75rem;
                    margin-top: 0.5rem;
                }

                .last-run-label {
                    font-weight: 500;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .result-triggered {
                    color: var(--accent-primary);
                }

                .result-normal {
                    color: var(--text-secondary);
                }

                .card-actions {
                    margin-top: auto;
                    padding-top: 0.5rem;
                }

                .run-btn {
                    width: 100%;
                    padding: 0.375rem 0.75rem;
                    background-color: var(--bg-tertiary);
                    color: var(--text-primary);
                    font-size: 0.75rem;
                    border-radius: var(--radius-sm);
                    border: none;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .run-btn:hover:not(:disabled) {
                    background-color: var(--bg-secondary); /* Assuming bg-hover isn't defined, using secondary or darker tertiary */
                    filter: brightness(0.95);
                }

                .run-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}
