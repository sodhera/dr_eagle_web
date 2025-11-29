"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getUserSessions, ChatSession, renameSession, deleteSession } from '@/services/agentClient';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectChat: (sessionId: string) => void;
  currentSessionId: string | null;
  refreshTrigger?: number; // Optional prop to force refresh
}

export default function Sidebar({ isOpen, onToggle, onNewChat, onSelectChat, currentSessionId, refreshTrigger }: SidebarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, chatId: string | null }>({ isOpen: false, chatId: null });
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user, refreshTrigger]);

  const loadChats = async () => {
    if (!user) return;
    try {
      const userChats = await getUserSessions();
      setChats(userChats);
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  // ... (handleClickOutside effect remains same)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node) &&
        profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRenameStart = (e: React.MouseEvent, chat: ChatSession) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title || getChatTitle(chat));
    setMenuOpenId(null);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      await renameSession(editingId, editTitle);
      setChats(chats.map(c => c.id === editingId ? { ...c, title: editTitle } : c));
      setEditingId(null);
    } catch (error) {
      console.error("Failed to rename chat:", error);
    }
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, chatId });
    setMenuOpenId(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.chatId) return;

    try {
      await deleteSession(deleteConfirmation.chatId);
      setChats(chats.filter(c => c.id !== deleteConfirmation.chatId));
      if (currentSessionId === deleteConfirmation.chatId) {
        onNewChat();
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    } finally {
      setDeleteConfirmation({ isOpen: false, chatId: null });
    }
  };

  const toggleMenu = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === chatId ? null : chatId);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Helper to get a title from messages if not explicit (though backend might provide title later, for now we infer or use first message)
  // The ChatSession interface doesn't have a 'title' field in the plan, but it has 'messages'.
  // Wait, the plan says: "messages": [...] // Full session objects.
  // It doesn't explicitly say there is a title field.
  // So we should derive title from the first user message.
  const getChatTitle = (session: ChatSession) => {
    if (session.title) return session.title;
    const firstUserMsg = session.messages.find(m => m.role === 'user');
    return firstUserMsg ? firstUserMsg.content.substring(0, 30) : 'New Chat';
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
        <span className="sidebar-brand" onClick={() => router.push('/')}>Orecce</span>
      </div>

      <div className="sidebar-content">
        <button className="new-chat-full-btn" onClick={onNewChat}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="new-chat-icon">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          New Chat
        </button>
        <button className="edit-memory-btn" onClick={() => router.push('/edit-memory')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Edit Memory
        </button>
        <button className="edit-memory-btn" onClick={() => router.push('/trackers')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 20V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Trackers
        </button>
        <div className="section-title">Your chats</div>
        <ul className="chat-list">
          {chats.map(chat => (
            <li
              key={chat.id}
              className={`chat-item ${currentSessionId === chat.id ? 'active' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              {editingId === chat.id ? (
                <form onSubmit={handleRenameSubmit} onClick={e => e.stopPropagation()} className="rename-form">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    autoFocus
                    onBlur={() => setEditingId(null)}
                    className="rename-input"
                  />
                </form>
              ) : (
                <>
                  <div className="chat-item-content">
                    <span className="chat-title">{getChatTitle(chat)}</span>
                  </div>
                  <div className="chat-options">
                    <button
                      className={`options-btn ${menuOpenId === chat.id ? 'active' : ''}`}
                      onClick={(e) => toggleMenu(e, chat.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                      </svg>
                    </button>
                    {menuOpenId === chat.id && (
                      <div className="options-menu" ref={menuRef} onClick={e => e.stopPropagation()}>
                        <div className="menu-item" onClick={(e) => handleRenameStart(e, chat)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Rename
                        </div>
                        <div className="menu-item delete" onClick={(e) => handleDeleteChat(e, chat.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          Delete
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
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

      {deleteConfirmation.isOpen && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmation({ isOpen: false, chatId: null })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Delete Chat?</h3>
            <p>Are you sure you want to delete this chat? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setDeleteConfirmation({ isOpen: false, chatId: null })}
              >
                Cancel
              </button>
              <button
                className="modal-btn delete"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
          padding-bottom: 80px; /* Space for absolute user profile */
        }

        .sidebar.closed {
          width: 0;
          border-right: none;
        }

        .sidebar-header {
          height: 60px; /* Reserve space for the top area */
          flex-shrink: 0;
          display: flex;
          align-items: center;
          padding: 0 var(--spacing-md);
          opacity: 1;
          transition: opacity 0.2s;
          position: relative;
        }

        .sidebar-brand {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .sidebar-brand:hover {
          opacity: 0.8;
        }

        .sidebar.closed .sidebar-header {
          opacity: 0;
          pointer-events: none;
        }

        .new-chat-full-btn {
          background: transparent;
          color: var(--text-primary);
          border: none;
          border-radius: var(--radius-sm);
          width: 100%;
          height: 40px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 12px;
          cursor: pointer;
          transition: background 0.2s;
          outline: none;
          margin-bottom: 2px; /* Match chat item spacing */
          font-size: 0.9rem;
          font-weight: 500;
        }

        .new-chat-icon {
          color: var(--accent-primary);
        }

        .new-chat-full-btn:hover {
          background: var(--bg-tertiary);
        }

        .edit-memory-btn {
          background: transparent;
          color: var(--text-primary);
          border: none;
          border-radius: var(--radius-sm);
          width: 100%;
          height: 40px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 12px;
          cursor: pointer;
          transition: all 0.2s;
          outline: none;
          margin-bottom: 2px; /* Match chat item spacing */
          font-size: 0.9rem;
          font-weight: 500;
        }

        .edit-memory-btn:hover {
          background: var(--bg-tertiary);
        }

        .sidebar-toggle {
          position: absolute;
          top: var(--spacing-md);
          right: var(--spacing-md); /* Top right when open */
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
          transition: background-color 0.2s, color 0.2s, right 0.3s ease, left 0.3s ease;
          outline: none;
        }

        .sidebar.closed .sidebar-toggle {
          right: auto;
          left: var(--spacing-md); /* Top left when closed */
          position: fixed; /* Keep it fixed on screen when closed */
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
          min-width: 260px;
          padding: 0 var(--spacing-xs); /* Small side padding */
          transition: opacity 0.2s;
        }

        .sidebar.closed .sidebar-content {
          opacity: 0;
          pointer-events: none;
          visibility: hidden;
        }

        .section-title {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-sm);
          opacity: 0.7;
          padding: var(--spacing-md) var(--spacing-sm) 0 var(--spacing-sm); /* Align with items */
        }

        .chat-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .chat-item {
          padding: var(--spacing-sm) var(--spacing-md);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
          color: var(--text-primary);
          position: relative;
          group: true; /* Enable group hover */
          height: 40px; /* Fixed height for consistency */
          border-radius: var(--radius-sm); /* Restore rounded corners */
          margin-bottom: 2px; /* Small gap between items */
        }

        .chat-item-content {
          flex: 1;
          display: flex;
          align-items: center;
          overflow: hidden;
          padding-right: 8px;
        }
        
        .chat-title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }

        .chat-options {
          position: relative;
          display: flex;
          align-items: center;
        }

        .options-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.2s, background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-item:hover .options-btn,
        .options-btn.active {
          opacity: 1;
        }

        .options-btn:hover {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .options-menu {
          position: absolute;
          right: 0;
          top: 100%;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          padding: 4px;
          z-index: 50;
          min-width: 120px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          font-size: 0.85rem;
          color: var(--text-primary);
          cursor: pointer;
          border-radius: 2px;
        }

        .menu-item:hover {
          background-color: var(--bg-tertiary);
        }

        .menu-item.delete {
          color: #ff6b6b;
        }

        .menu-item.delete:hover {
          background-color: rgba(255, 107, 107, 0.1);
        }

        .rename-form {
          flex: 1;
          display: flex;
        }

        .rename-input {
          width: 100%;
          background: var(--bg-tertiary);
          border: 1px solid var(--accent-primary);
          color: var(--text-primary);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9rem;
          outline: none;
        }

        .chat-item:hover {
          background-color: var(--bg-tertiary);
        }

        .chat-item.active {
          background-color: var(--bg-tertiary);
        }

        .sidebar-footer {
          /* Removed padding/border as profile is now fixed */
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          cursor: pointer;
          padding: var(--spacing-md);
          border-top: 1px solid var(--border-subtle);
          transition: all 0.3s ease;
          width: 100%;
          background-color: var(--bg-secondary);
          z-index: 20;
          position: absolute;
          bottom: 0;
          left: 0;
          white-space: nowrap;
        }

        .sidebar.closed .user-profile {
          bottom: var(--spacing-md);
          left: var(--spacing-md);
          width: 40px; /* Just avatar width + padding */
          background-color: transparent;
          border-top: none;
          padding: 0;
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
          left: var(--spacing-md); /* Align with profile padding */
          width: 200px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          padding: var(--spacing-xs);
          z-index: 100;
          margin-bottom: var(--spacing-xs);
        }

        .sidebar.closed .settings-popup {
          left: 0; /* Align with floating avatar */
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

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
        }

        .modal-content {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: var(--spacing-lg);
          width: 320px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .modal-content h3 {
          margin-top: 0;
          margin-bottom: var(--spacing-sm);
          color: var(--text-primary);
          font-size: 1.1rem;
        }

        .modal-content p {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: var(--spacing-lg);
          line-height: 1.5;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-sm);
        }

        .modal-btn {
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
          font-weight: 500;
        }

        .modal-btn.cancel {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .modal-btn.cancel:hover {
          background-color: var(--bg-hover, #333); /* Fallback if var not defined */
        }

        .modal-btn.delete {
          background-color: #ff6b6b;
          color: white;
        }

        .modal-btn.delete:hover {
          background-color: #ff5252;
        }
      `}</style>
    </aside>
  );
}
