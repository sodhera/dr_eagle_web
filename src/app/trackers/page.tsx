"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { listTrackers } from '@/services/trackerClient';
import { Tracker } from '@/types/tracking';
import CentralTrackerWidget from '@/components/trackers/CentralTrackerWidget';
import TrackerCard from '@/components/trackers/TrackerCard';
import TrackerDetailModal from '@/components/trackers/TrackerDetailModal';

export default function TrackersPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [trackers, setTrackers] = useState<Tracker[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTracker, setSelectedTracker] = useState<Tracker | null>(null);
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);

    const loadTrackers = async () => {
        try {
            setLoading(true);
            console.log("Loading trackers...");
            const data = await listTrackers();
            console.log("Trackers loaded:", data);
            setTrackers(data);
            setError(null);
        } catch (error: any) {
            console.error("Failed to load trackers", error);
            setError(error.message || "Failed to load trackers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        loadTrackers();
    }, [user, authLoading, router]);


    return (
        <div className="page-container">
            <Sidebar
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                onNewChat={() => router.push('/')}
                onSelectChat={(sessionId: string) => router.push(`/?chatId=${sessionId}`)}
                currentSessionId={null}
            />
            <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="content-scroll">
                    <div className="content-wrapper">
                        <header className="page-header">
                            <div>
                                <h1 className="page-title">Trackers</h1>
                                <p className="page-subtitle">Manage your automated monitoring agents</p>
                            </div>
                        </header>

                        {error ? (
                            <div className="error-container">
                                <p className="error-title">Error loading trackers:</p>
                                <p>{error}</p>
                                <button
                                    onClick={() => loadTrackers()}
                                    className="retry-btn"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : loading ? (
                            <div className="loading-state">Loading trackers...</div>
                        ) : trackers.length === 0 ? (
                            <div className="empty-state">
                                <p>No trackers found.</p>
                            </div>
                        ) : (
                            <>
                                <section>
                                    <CentralTrackerWidget tracker={trackers[0] || null} />
                                </section>

                                <section>
                                    <h2 className="section-title">Active Trackers</h2>
                                    <div className="trackers-grid">
                                        {trackers.map(tracker => (
                                            <TrackerCard
                                                key={tracker.id}
                                                tracker={tracker}
                                                onClick={setSelectedTracker}
                                            />
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {selectedTracker && (
                <TrackerDetailModal
                    tracker={selectedTracker}
                    onClose={() => setSelectedTracker(null)}
                    onDelete={(deletedId) => {
                        setTrackers(prev => prev.filter(t => t.id !== deletedId));
                        setSelectedTracker(null);
                    }}
                />
            )}

            <style jsx>{`
                .page-container {
                    display: flex;
                    height: 100vh;
                    background-color: var(--bg-primary);
                    overflow: hidden;
                }

                .main-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    transition: margin-left 0.3s ease;
                    overflow: hidden;
                }

                .content-scroll {
                    flex: 1;
                    overflow-y: auto;
                    padding: 2rem;
                }

                .content-wrapper {
                    max-width: 64rem; /* max-w-5xl */
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem; /* space-y-8 */
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .page-title {
                    font-size: 1.5rem; /* text-2xl */
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .page-subtitle {
                    color: var(--text-secondary);
                    font-size: 0.875rem; /* text-sm */
                    margin-top: 0.25rem;
                }

                .create-btn {
                    padding: 0.5rem 1rem;
                    background-color: var(--accent-primary);
                    color: white;
                    border-radius: var(--radius-md);
                    font-size: 0.875rem;
                    font-weight: 500;
                    border: none;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .create-btn:hover:not(:disabled) {
                    background-color: var(--accent-hover);
                }

                .create-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .error-container {
                    text-align: center;
                    padding: 2.5rem;
                    border: 1px solid #ef4444;
                    border-radius: var(--radius-md);
                    color: #ef4444;
                }

                .error-title {
                    font-weight: bold;
                }

                .retry-btn {
                    margin-top: 1rem;
                    padding: 0.5rem 1rem;
                    background-color: var(--bg-tertiary);
                    border-radius: var(--radius-md);
                    font-size: 0.875rem;
                    border: none;
                    cursor: pointer;
                }

                .loading-state, .empty-state {
                    text-align: center;
                    padding: 2.5rem;
                    color: var(--text-secondary);
                }

                .section-title {
                    font-size: 1.125rem; /* text-lg */
                    font-weight: 500;
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                }

                .trackers-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                @media (min-width: 768px) {
                    .trackers-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (min-width: 1024px) {
                    .trackers-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
            `}</style>
        </div>
    );
}
