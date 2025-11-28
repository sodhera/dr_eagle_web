'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

type Tab = 'general' | 'appearance' | 'account';

export default function SettingsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

    useEffect(() => {
        // Initialize theme from localStorage or system preference
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            setTheme('system');
        }
    }, []);

    const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
        const root = document.documentElement;
        if (newTheme === 'dark') {
            root.setAttribute('data-theme', 'dark');
        } else if (newTheme === 'light') {
            root.removeAttribute('data-theme');
        } else {
            // System
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.setAttribute('data-theme', 'dark');
            } else {
                root.removeAttribute('data-theme');
            }
        }
    };

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    return (
        <div className="settings-page">
            <div className="settings-container glass-panel">
                <div className="settings-header">
                    <button className="back-btn" onClick={() => router.back()}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back
                    </button>
                    <h1>Settings</h1>
                </div>

                <div className="settings-body">
                    <div className="settings-sidebar">
                        <button
                            className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                            onClick={() => setActiveTab('general')}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                            General
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
                            onClick={() => setActiveTab('appearance')}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                            </svg>
                            Appearance
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
                            onClick={() => setActiveTab('account')}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Account
                        </button>
                    </div>

                    <div className="content-area">
                        {activeTab === 'general' && (
                            <div className="settings-section animate-fade-in">
                                <h3>General Settings</h3>
                                <div className="setting-item">
                                    <label>Language</label>
                                    <select className="select-input">
                                        <option value="en">English</option>
                                        <option value="es">Spanish</option>
                                        <option value="fr">French</option>
                                    </select>
                                </div>
                                <div className="setting-item">
                                    <label>Notifications</label>
                                    <div className="toggle-switch">
                                        <input type="checkbox" id="notifications" defaultChecked />
                                        <label htmlFor="notifications"></label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="settings-section animate-fade-in">
                                <h3>Appearance</h3>
                                <div className="setting-item">
                                    <label>Theme</label>
                                    <div className="theme-options">
                                        <button
                                            className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                                            onClick={() => handleThemeChange('light')}
                                        >
                                            Light
                                        </button>
                                        <button
                                            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                                            onClick={() => handleThemeChange('dark')}
                                        >
                                            Dark
                                        </button>
                                        <button
                                            className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                                            onClick={() => handleThemeChange('system')}
                                        >
                                            System
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'account' && (
                            <div className="settings-section animate-fade-in">
                                <h3>Account</h3>
                                <div className="profile-summary">
                                    <div className="avatar-large">
                                        {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                                    </div>
                                    <div className="profile-details">
                                        <div className="profile-name">{user?.displayName || 'User'}</div>
                                        <div className="profile-email">{user?.email}</div>
                                    </div>
                                </div>
                                <div className="setting-item">
                                    <label>Plan</label>
                                    <div className="plan-badge">Pro Plan</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
        .settings-page {
          min-height: 100vh;
          background-color: var(--bg-secondary);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: var(--spacing-xl);
        }

        .settings-container {
          width: 100%;
          max-width: 1000px;
          height: 80vh;
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .settings-header {
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .settings-header h1 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.95rem;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          transition: all 0.2s;
        }

        .back-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
          color: var(--text-primary);
        }

        .settings-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .settings-sidebar {
          width: 260px;
          background-color: rgba(249, 250, 251, 0.3);
          border-right: 1px solid var(--glass-border);
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.95rem;
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all 0.2s;
          text-align: left;
        }

        .tab-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
          color: var(--text-primary);
        }

        .tab-btn.active {
          background-color: var(--bg-primary);
          color: var(--accent-primary);
          font-weight: 500;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .content-area {
          flex: 1;
          padding: var(--spacing-2xl);
          overflow-y: auto;
          background-color: var(--bg-primary);
        }

        .settings-section h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: var(--spacing-xl);
          color: var(--text-primary);
        }

        .setting-item {
          margin-bottom: var(--spacing-xl);
        }

        .setting-item label {
          display: block;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: var(--spacing-sm);
        }

        .select-input {
          width: 100%;
          max-width: 320px;
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .select-input:focus {
          border-color: var(--accent-primary);
        }

        .theme-options {
          display: flex;
          gap: var(--spacing-md);
        }

        .theme-btn {
          padding: var(--spacing-sm) var(--spacing-xl);
          border: 1px solid var(--border-subtle);
          background-color: var(--bg-secondary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.95rem;
          transition: all 0.2s;
          color: var(--text-primary);
        }

        .theme-btn:hover {
          border-color: var(--accent-primary);
        }

        .theme-btn.active {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          background-color: rgba(24, 66, 99, 0.05);
          font-weight: 500;
        }

        .profile-summary {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
          padding-bottom: var(--spacing-xl);
          border-bottom: 1px solid var(--border-subtle);
        }

        .avatar-large {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: #555;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 600;
        }

        .profile-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .profile-email {
          font-size: 1rem;
          color: var(--text-secondary);
        }

        .plan-badge {
          display: inline-block;
          padding: 6px 16px;
          background-color: rgba(24, 66, 99, 0.1);
          color: var(--accent-primary);
          border-radius: 100px;
          font-size: 0.9rem;
          font-weight: 500;
        }
      `}</style>
        </div>
    );
}
