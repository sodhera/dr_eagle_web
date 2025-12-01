'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import Homepage from '@/components/Homepage';
import { getChatHistory, Message } from '@/services/agentClient';

function HomeContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [refreshSidebarTrigger, setRefreshSidebarTrigger] = useState(0);

  const chatIdParam = searchParams.get('chatId');

  useEffect(() => {
    if (chatIdParam && chatIdParam !== currentSessionId && user) {
      handleSelectChat(chatIdParam);
    }
  }, [chatIdParam, user]);

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
    // Remove chatId from URL without reloading
    const newUrl = window.location.pathname;
    window.history.pushState({}, '', newUrl);
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
        onSelectChat={(id) => {
          handleSelectChat(id);
          // Optional: update URL to reflect selected chat
          // router.push(`/?chatId=${id}`); 
          // But maybe we don't want to force reload or clutter history if not needed.
          // The user request implies they want the link to work.
        }}
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

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
