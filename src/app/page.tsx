'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';

interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
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

  // ChatArea now handles the sending logic internally
  const handleSend = () => { };

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
          <>
          </>
        )}
        <ChatArea
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          onSuggestionClick={handleSuggestionClick}
          setMessages={setMessages}
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
