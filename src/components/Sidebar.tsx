import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
}

export default function Sidebar({ isOpen, onToggle, onNewChat }: SidebarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If click is inside profile container (which includes popup), do nothing.
      // Let the onClick handler on user-profile manage the toggle.
      if (profileRef.current && profileRef.current.contains(event.target as Node)) {
        return;
      }

      // Otherwise, if click is outside, close it.
      if (showSettings) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <aside className={`sidebar ${!isOpen ? 'closed' : ''}`}>
      <button className="sidebar-toggle" aria-label="Toggle Sidebar" onClick={onToggle}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      </button>
      <div className="sidebar-header">
        <button className="new-chat-btn" aria-label="New Chat" onClick={onNewChat}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="sidebar-content">
        <div className="section-title">Your chats</div>
        <ul className="chat-list">
          <li className="chat-item active">
            <span className="chat-title">DrEagle Planning</span>
            <span className="chat-date">Today</span>
          </li>
          <li className="chat-item">
            <span className="chat-title">React Components</span>
            <span className="chat-date">Yesterday</span>
          </li>
          <li className="chat-item">
            <span className="chat-title">CSS Variables</span>
            <span className="chat-date">2 days ago</span>
          </li>
        </ul>
      </div>

      <div className="user-profile" ref={profileRef} onClick={() => setShowSettings(!showSettings)}>
        <div className="avatar">{getInitials(user?.displayName)}</div>
        <div className="user-info">
          <span className="user-name">{user?.displayName || 'User'}</span>
          <span className="user-plan">Pro Plan</span>
        </div>

        {showSettings && (
          <div
            className="settings-popup"
            ref={settingsRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popup-item" onClick={() => {
              setShowSettings(false);
              router.push('/settings');
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Settings
            </div>
            <div className="popup-divider"></div>
            <div className="popup-item logout" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Log out
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .sidebar {
          width: 260px;
          background-color: var(--bg-secondary);
          height: 100vh;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          transition: width 0.3s ease, transform 0.3s ease;
          overflow: visible; /* Allow popup to overflow */
          flex-shrink: 0;
          position: relative;
        }

        .sidebar.closed {
          width: 0;
          border-right: none;
        }

        .sidebar-header {
          padding: var(--spacing-md);
          display: flex;
          justify-content: flex-end; /* Align new chat to right or just push it? */
          /* Actually, if toggle is left, new chat should be next to it? Or far right? */
          /* ChatGPT has toggle left, new chat right next to it. */
          /* Let's use margin-left on the button or just padding-left on header. */
          padding-left: 60px; /* Space for fixed toggle (16px + 32px + gap) */
          align-items: center;
          min-width: 260px; /* Prevent content squishing during transition */
          opacity: 1;
          transition: opacity 0.2s;
        }

        .sidebar.closed .sidebar-header {
          opacity: 0;
          pointer-events: none;
        }

        .new-chat-btn {
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
          outline: none;
        }

        .new-chat-btn:focus {
          outline: none;
        }

        .new-chat-btn:hover {
          background: var(--accent-hover);
        }

        .sidebar-toggle {
          position: fixed;
          top: var(--spacing-md);
          left: var(--spacing-md);
          z-index: 20;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, color 0.2s;
          outline: none;
        }

        .sidebar-toggle:focus {
          outline: none;
        }

        .sidebar-toggle:hover {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: var(--spacing-md);
          min-width: 260px;
          margin-top: 40px; /* Add margin for fixed toggle */
        }

        .section-title {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-sm);
          opacity: 0.7;
        }

        .chat-list {
          list-style: none;
        }

        .chat-item {
          padding: var(--spacing-sm) var(--spacing-md);
          margin: 0 -var(--spacing-md);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: var(--text-primary);
          border-radius: var(--radius-sm);
        }

        .chat-item:hover {
          background-color: var(--bg-tertiary);
        }

        .chat-item.active {
          background-color: var(--bg-tertiary);
        }

        .chat-date {
          font-size: 0.75rem;
          opacity: 0.5;
        }

        .sidebar-footer {
          /* Removed padding/border as profile is now fixed */
        }

        .user-profile {
          position: fixed;
          bottom: var(--spacing-md);
          left: var(--spacing-md);
          z-index: 20;
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          cursor: pointer;
          padding: var(--spacing-xs);
          border-radius: var(--radius-sm);
          transition: all 0.3s ease;
          width: calc(260px - var(--spacing-md) * 2); /* Full width minus margins */
          background-color: transparent;
        }

        .sidebar.closed .user-profile {
          width: 40px; /* Just avatar width + padding */
          background-color: transparent;
        }

        .user-profile:hover {
          background-color: var(--bg-tertiary);
        }

        .avatar {
          width: 32px;
          height: 32px;
          background-color: #555;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          color: white;
          flex-shrink: 0;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          opacity: 1;
          transition: opacity 0.2s ease;
          white-space: nowrap;
          overflow: hidden;
        }

        .sidebar.closed .user-info {
          opacity: 0;
          pointer-events: none;
          width: 0;
        }

        .user-name {
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .user-plan {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .settings-popup {
          position: absolute;
          bottom: 100%;
          left: 0; /* Align with profile */
          width: 200px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          padding: var(--spacing-xs);
          z-index: 100;
          margin-bottom: var(--spacing-xs);
        }

        .popup-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm);
          font-size: 0.9rem;
          color: var(--text-primary);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: background-color 0.2s;
        }

        .popup-item:hover {
          background-color: var(--bg-tertiary);
        }

        .popup-divider {
          height: 1px;
          background-color: var(--border-subtle);
          margin: var(--spacing-xs) 0;
        }

        .popup-item.logout {
          color: #ff6b6b;
        }

        .popup-item.logout:hover {
          background-color: rgba(255, 107, 107, 0.1);
        }
      `}</style>
    </aside>
  );
}
