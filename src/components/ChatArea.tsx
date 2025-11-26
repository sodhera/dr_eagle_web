import React, { useEffect, useRef } from 'react';
import WelcomeScreen from './WelcomeScreen';
import MessageInput from './MessageInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAreaProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSuggestionClick: (text: string) => void;
}

export default function ChatArea({ messages, inputValue, onInputChange, onSend, onSuggestionClick }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <main className="chat-area">
      {messages.length > 0 ? (
        <div className="chat-container">
          <div className="messages-list">
            {messages.map((msg, index) => (
              <div key={index} className={`message-row ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? 'SS' : '🦅'}
                </div>
                <div className="message-content">
                  {msg.role === 'assistant' && <div className="sender-name">DrEagle</div>}
                  <div className="message-text">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="input-area-sticky">
            <MessageInput value={inputValue} onChange={onInputChange} onSend={onSend} />
          </div>
        </div>
      ) : (
        <WelcomeScreen
          onSuggestionClick={onSuggestionClick}
          inputValue={inputValue}
          onInputChange={onInputChange}
          onSend={onSend}
        />
      )}

      <style jsx>{`
        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: var(--bg-primary);
          position: relative;
        }

        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }

        .messages-list {
          flex: 1;
          overflow-y: auto;
          padding: var(--spacing-xl) var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .message-row {
          display: flex;
          gap: var(--spacing-md);
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .message-row.user .message-avatar {
          background-color: #555;
          color: white;
        }

        .message-row.assistant .message-avatar {
          background-color: var(--accent-primary);
          color: white;
        }

        .message-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          max-width: 100%;
        }

        .sender-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .message-text {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-primary);
          white-space: pre-wrap;
        }

        .input-area-sticky {
          padding: var(--spacing-md);
          background-color: var(--bg-primary);
          /* border-top: 1px solid var(--border-subtle); */
        }
      `}</style>
    </main>
  );
}
