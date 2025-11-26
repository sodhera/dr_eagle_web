'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

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
    return null; // Don't render anything while redirecting
  }

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputValue('');
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: inputValue }
    ];
    setMessages(newMessages);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "I'm DrEagle, your AI assistant. I'm currently in a rudimentary state, but I can echo your thoughts and help you plan! \n\nThat sounds like a great idea. Tell me more about it." }
      ]);
    }, 1000);
  };

  const handleSuggestionClick = (text: string) => {
    setInputValue(text);
    // Optional: auto-send on click
    // handleSendMessage(); 
  };

  return (
    <div className="app-container">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
        onNewChat={handleNewChat}
      />
      <div className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
        {!isSidebarOpen && (
          <button className="sidebar-toggle-fixed" onClick={handleToggleSidebar} aria-label="Open Sidebar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        )}
        <ChatArea
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          onSuggestionClick={handleSuggestionClick}
        />
      </div>

      <style jsx>{`
        .app-container {
          display: flex;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }

        .main-content {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .sidebar-toggle-fixed {
          position: absolute;
          top: var(--spacing-md);
          left: var(--spacing-md);
          z-index: 10;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 8px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, color 0.2s;
        }

        .sidebar-toggle-fixed:hover {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
