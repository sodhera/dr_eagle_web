import React, { useEffect, useRef, useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import MessageInput from './MessageInput';
import { sendMessage } from '../services/agentClient';

interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: any[]; // Add this to support typing
}

interface ChatAreaProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSuggestionClick: (text: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export default function ChatArea({ messages, inputValue, onInputChange, onSend, onSuggestionClick, setMessages }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { role: 'user', content: inputValue };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    onInputChange(''); // Clear input immediately
    setIsLoading(true);

    try {
      await processChatLoop(newMessages);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const processChatLoop = async (currentMessages: Message[]) => {
    // We only send the last user message to the agent API
    // The agent handles history persistence on the backend
    const lastMessage = currentMessages[currentMessages.length - 1];
    if (lastMessage.role !== 'user') return;

    const response = await sendMessage(lastMessage.content);

    // The backend returns the full session history, but for now we just want to append the new assistant message
    // We can assume the last message in the returned history is the assistant's response
    const assistantResponse = response.messages[response.messages.length - 1];

    if (assistantResponse && assistantResponse.role === 'assistant') {
      setMessages(prev => [...prev, { role: 'assistant', content: assistantResponse.content }]);
    }
  };

  // Override the parent's onSend to use our local handleSend
  // But wait, the parent passed onSend. We should probably update the parent to delegate to us 
  // or we just ignore the parent's onSend and use our own logic since we control the state via setMessages.
  // The prompt asked to "Update ChatArea.tsx", so I'm assuming I own the logic now.

  return (
    <main className="chat-area">
      {messages.length > 0 ? (
        <div className="chat-container">
          <div className="messages-list">
            {messages.map((msg, index) => {
              // Skip rendering tool messages and assistant messages that ONLY have tool calls (no content)
              if (msg.role === 'tool') return null;
              if (msg.role === 'assistant' && !msg.content && msg.tool_calls) return null;

              return (
                <div key={index} className={`message-row ${msg.role}`}>
                  {msg.role === 'user' ? (
                    <div className="user-message-bubble">
                      <div className="message-text">{msg.content}</div>
                      <div className="message-avatar">
                        SS
                      </div>
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <div className="message-content">
                      <div className="sender-name">DrEagle</div>
                      <div className="message-text">{msg.content}</div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {isLoading && (
              <div className="message-row assistant">
                <div className="message-content">
                  <div className="sender-name">DrEagle</div>
                  <div className="message-text">Thinking...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="input-area-sticky">
            <div className="input-mask" />
            <MessageInput value={inputValue} onChange={onInputChange} onSend={handleSend} />
          </div>
        </div>
      ) : (
        <WelcomeScreen
          onSuggestionClick={onSuggestionClick}
          inputValue={inputValue}
          onInputChange={onInputChange}
          onSend={handleSend}
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
          width: 100%;
          position: relative; /* Needed for absolute positioning of input */
        }

        .messages-list {
          height: 100%; /* Full height */
          overflow-y: scroll; /* Force scrollbar track for consistent alignment */
          overflow-x: hidden;
          padding: var(--spacing-xl) var(--spacing-md) 160px var(--spacing-md); /* Large bottom padding for input area */
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }



        .input-area-sticky {
          padding: 0 var(--spacing-md) var(--spacing-md) var(--spacing-md);
          padding-right: calc(var(--spacing-md) + 8px); /* Compensate for 8px scrollbar to align centers */
          background-color: transparent; /* Transparent container */
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          position: absolute;
          bottom: 0;
          left: 0;
          z-index: 10;
          /* Removed border and backdrop filter */
        }
        
        .input-mask {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 100%;
          max-width: 768px; /* Match text column width */
          background-color: var(--bg-primary); /* Solid background to hide text */
          z-index: -1; /* Behind input box */
        }
        
        .input-mask::before {
          content: '';
          position: absolute;
          top: -40px; /* Extend upwards */
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(to bottom, transparent, var(--bg-primary));
          pointer-events: none; /* Let clicks pass through */
        }


        .message-row {
          display: flex;
          gap: var(--spacing-md);
          width: 100%;
          max-width: 768px;
          align-self: center; /* Center the content */
        }

        .message-row.user {
          justify-content: flex-end;
        }

        .user-message-bubble {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          background-color: var(--accent-primary);
          padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-lg);
          border-radius: var(--radius-lg);
          color: white;
          max-width: 80%;
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

        .user-message-bubble .message-avatar {
          background-color: rgba(255, 255, 255, 0.8);
          color: var(--text-primary);
          font-weight: 500;
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
          overflow-x: hidden; /* Ensure content doesn't overflow */
        }

        .sender-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .message-text {
          font-size: 1rem;
          line-height: 1.6;
        }
        
        .user-message-bubble .message-text {
          color: white;
          text-align: left;
        }

        .message-row.assistant .message-text {
          color: var(--text-primary);
          white-space: pre-wrap;
        }

        /* Ensure images don't overflow */
        .message-text :global(img) {
          max-width: 100%;
          height: auto;
          border-radius: var(--radius-md);
          margin-top: var(--spacing-sm);
        }


      `}</style>
    </main>
  );
}
