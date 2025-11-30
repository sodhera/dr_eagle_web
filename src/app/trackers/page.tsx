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

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const loadTrackers = async () => {
            try {
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
        loadTrackers();
    }, [user, authLoading, router]);

    return (
        <div className="flex h-screen bg-[var(--bg-primary)]">
            <Sidebar
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                onNewChat={() => router.push('/')}
                onSelectChat={(sessionId: string) => router.push(`/?chatId=${sessionId}`)}
                currentSessionId={null}
            />
            <main className={`flex-1 flex flex-col transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'ml-0' : 'ml-0'}`}>
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-5xl mx-auto space-y-8">
                        <header className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Trackers</h1>
                                <p className="text-[var(--text-secondary)] text-sm mt-1">Manage your automated monitoring agents</p>
                            </div>
                            <button className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white rounded-lg text-sm font-medium transition-colors">
                                + New Tracker
                            </button>
                        </header>

                        {error ? (
                            <div className="text-red-500 text-center py-10 border border-red-500 rounded p-4">
                                Error: {error}
                            </div>
                        ) : loading ? (
                            <div className="text-[var(--text-secondary)] text-center py-10">Loading trackers...</div>
                        ) : trackers.length === 0 ? (
                            <div className="text-[var(--text-secondary)] text-center py-10">
                                <p>No trackers found.</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-4 px-4 py-2 bg-[var(--bg-tertiary)] rounded text-sm"
                                >
                                    Reload Page
                                </button>
                            </div>
                        ) : (
                            <>
                                <section>
                                    <CentralTrackerWidget tracker={trackers[0] || null} />
                                </section>

                                <section>
                                    <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Active Trackers</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                />
            )}

            {/* Debug Info */}
            <div className="fixed bottom-4 right-4 p-4 bg-black/80 text-white text-xs rounded max-w-md max-h-64 overflow-auto z-50">
                <h3 className="font-bold mb-2">Debug Info</h3>
                <pre>Loading: {String(loading)}</pre>
                <pre>Error: {String(error)}</pre>
                <pre>Trackers Count: {trackers.length}</pre>
                <pre>User: {user ? user.uid : 'Not logged in'}</pre>
                <details>
                    <summary>Raw Trackers Data</summary>
                    <pre>{JSON.stringify(trackers, null, 2)}</pre>
                </details>
            </div>
        </div>
    );
}
