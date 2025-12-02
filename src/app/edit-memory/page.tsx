'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebarData } from '@/context/SidebarDataContext';
import Sidebar from '@/components/Sidebar';

export default function EditMemoryPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { isSidebarOpen, toggleSidebar } = useSidebarData();
    const [memoryText, setMemoryText] = useState('');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0a192f', color: 'white' }}>
                Loading...
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const handleNewChat = () => {
        router.push('/');
    };

    const handleSelectChat = (sessionId: string) => {
        // Navigate back to home with the selected session
        // We might need a way to pass the session ID, usually via query param or just simple navigation
        // For now, just go home, and let Home page handle default or we can implement query param support later if needed.
        // Actually, Sidebar expects onSelectChat to switch chats. If we are on a different page, we should probably go to home.
        router.push(`/?session=${sessionId}`);
        // Note: Home page might not support ?session= yet, but this is a reasonable placeholder. 
        // If Home doesn't support it, it will just open default.
        // Alternatively, just router.push('/') is safer for now.
        router.push('/');
    };

    const handleSave = () => {
        console.log("Saving memory:", memoryText);
        alert("Memory saved! (Mock)");
    };

    return (
        <div className="app-container">
            <Sidebar
                isOpen={isSidebarOpen}
                onToggle={toggleSidebar}
                onNewChat={handleNewChat}
                onSelectChat={handleSelectChat}
                currentSessionId={null} // No active chat session on this page
            />
            <div className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
                <div className="edit-container">
                    <div className="content-wrapper">
                        <h1 className="page-title">Edit Memory</h1>
                        <div className="textarea-wrapper">
                            <textarea
                                className="memory-input"
                                placeholder="Edit your memory here..."
                                value={memoryText}
                                onChange={(e) => setMemoryText(e.target.value)}
                            />
                            <button className="save-btn" onClick={handleSave}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .app-container {
          display: flex;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background-color: var(--bg-primary);
          color: var(--text-primary);
        }

        .main-content {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          transition: margin-left 0.3s ease;
        }

        .edit-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 2rem;
        }

        .content-wrapper {
            width: 80%;
            max-width: 800px;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .page-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
        }

        .textarea-wrapper {
            position: relative;
            width: 100%;
            height: 60vh;
        }

        .memory-input {
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 1.5rem;
            color: var(--text-primary);
            font-size: 1rem;
            resize: none;
            outline: none;
            backdrop-filter: blur(10px);
            font-family: var(--font-sans);
        }

        .memory-input:focus {
            border-color: var(--accent-primary);
            background: rgba(255, 255, 255, 0.08);
        }

        .save-btn {
            position: absolute;
            bottom: 1rem;
            right: 1rem;
            background-color: var(--accent-primary);
            color: white;
            border: none;
            padding: 0.5rem 1.5rem;
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        .save-btn:hover {
            background-color: var(--accent-hover);
        }
      `}</style>
        </div>
    );
}
