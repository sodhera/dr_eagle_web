"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function TrackersPage() {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
    const router = useRouter();

    return (
        <div className="flex h-screen bg-[var(--bg-primary)]">
            <Sidebar
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                onNewChat={() => router.push('/')}
                onSelectChat={(sessionId: string) => router.push(`/?chatId=${sessionId}`)}
                currentSessionId={null}
            />
            <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-0' : 'ml-0'}`}>
                <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold mb-2">Trackers</h1>
                        <p>Trackers functionality coming soon.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
