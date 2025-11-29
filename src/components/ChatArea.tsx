
import React, { useEffect, useRef, useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import MessageInput from './MessageInput';
import { sendMessage, Message, ToolCall } from '../services/agentClient';
import { getWidgetForTool } from './WidgetRegistry';
import ReactMarkdown from 'react-markdown';

interface ChatAreaProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSuggestionClick: (text: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sessionId: string | null;
  onSessionCreated: (sessionId: string, firstMessage: string) => void;
}

export default function ChatArea({ messages, inputValue, onInputChange, onSuggestionClick, setMessages, sessionId, onSessionCreated }: ChatAreaProps) {
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

    const userMessage: Message = { role: 'user', content: inputValue, timestamp: Date.now() };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    onInputChange(''); // Clear input immediately
    setIsLoading(true);

    try {
      await processChatLoop(newMessages, inputValue);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error.", timestamp: Date.now() / 1000 }]);
    } finally {
      setIsLoading(false);
    }
  };

  const processChatLoop = async (currentMessages: Message[], originalInput: string) => {
    // We only send the last user message to the agent API
    // The agent handles history persistence on the backend
    const lastMessage = currentMessages[currentMessages.length - 1];
    if (lastMessage.role !== 'user') return;


    // Pass the current sessionId (if any) to continue the chat
    const response = await sendMessage(lastMessage.content, sessionId || undefined);

    // If we didn't have a session ID before, and the response has one, it's a new session
    if (!sessionId && response.id) {
      onSessionCreated(response.id, originalInput);
    }

    // The backend returns the full session history.
    // We need to find which messages are "new" (i.e., added after our last known message)
    // and append ALL of them to our local state.
    console.log("🔍 FULL BACKEND HISTORY:", JSON.stringify(response.messages, null, 2));

    const lastKnownTimestamp = currentMessages[currentMessages.length - 1]?.timestamp || 0;

    const newMessages = response.messages.filter(msg => {
      // Filter out messages we already have based on timestamp
      // Also filter out 'user' messages because we already added the user message optimistically
      return (msg.timestamp || 0) > lastKnownTimestamp && msg.role !== 'user';
    });

    if (newMessages.length > 0) {
      setMessages(prev => [...prev, ...newMessages]);
    }
  };

  return (
    <main className="chat-area">
      {messages.length > 0 ? (
        <div className="chat-container">
          <div className="messages-list">
            {messages.map((msg, index) => {
              // Skip rendering tool messages (the output of tools)
              if (msg.role === 'tool') return null;

              // Render Tool Calls (Widgets)
              const widgets: React.ReactNode[] = [];
              if (msg.toolCalls && msg.toolCalls.length > 0) {
                msg.toolCalls.forEach(toolCall => {
                  const widget = getWidgetForTool(toolCall.function.name, toolCall.function.arguments);
                  if (widget) {
                    widgets.push(
                      <div key={toolCall.id} className="widget-container">
                        {widget}
                      </div>
                    );
                  }
                });
              }

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


                      {/* Render Text Content if present */}
                      {msg.content && (
                        <div className="message-text">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}

                      {/* Render Widgets if present */}
                      {widgets.length > 0 && (
                        <div className="widgets-list">
                          {widgets}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {isLoading && (
              <div className="message-row assistant">
                <div className="message-content">

                  <div className="message-text">Thinking<span className="thinking-dots"></span></div>
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
        }

        /* Ensure images don't overflow */
        .message-text :global(img) {
          max-width: 100%;
          height: auto;
          border-radius: var(--radius-md);
          margin-top: var(--spacing-sm);
        }

        .message-text :global(p) {
          margin: 0 0 0.5em 0;
        }
        
        .message-text :global(p:last-child) {
          margin-bottom: 0;
        }

        .message-text :global(p:empty) {
          display: none;
        }

        .widgets-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 12px;
        }

        .widget-container {
          width: 100%;
          max-width: 420px;
        }

        .thinking-dots::after {
          content: '.';
          animation: dots 1.5s steps(1, end) infinite;
          display: inline-block;
          width: 1.2em;
          text-align: left;
        }

        @keyframes dots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
        }
      `}</style>
    </main>
  );
}
