'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import Homepage from '@/components/Homepage';
import { getChatHistory, Message } from '@/services/agentClient';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [refreshSidebarTrigger, setRefreshSidebarTrigger] = useState(0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'white', color: 'black' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Homepage />;
  }

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputValue('');
    setCurrentSessionId(null);
  };

  const handleSelectChat = async (sessionId: string) => {
    try {
      setCurrentSessionId(sessionId);
      const history = await getChatHistory(sessionId);
      setMessages(history.messages);
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const handleSessionCreated = (sessionId: string, firstMessage: string) => {
    setCurrentSessionId(sessionId);
    // Trigger sidebar refresh to show the new chat
    setRefreshSidebarTrigger(prev => prev + 1);
  };

  const handleSuggestionClick = (text: string) => {
    setInputValue(text);
  };

  return (
    <div className="app-container">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        currentSessionId={currentSessionId}
        refreshTrigger={refreshSidebarTrigger}
      />
      <div className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
        {!isSidebarOpen && (
          <>
          </>
        )}
        <ChatArea
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSuggestionClick={handleSuggestionClick}
          setMessages={setMessages}
          sessionId={currentSessionId}
          onSessionCreated={handleSessionCreated}
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
      `}</style>
    </div>
  );
}
