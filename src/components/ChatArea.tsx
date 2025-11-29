import React, { useEffect, useRef, useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import MessageInput from './MessageInput';
import { sendMessage, Message, ToolCall } from '../services/agentClient';
import { getWidgetForTool } from './WidgetRegistry';

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

    const userMessage: Message = { role: 'user', content: inputValue, timestamp: Date.now() / 1000 };
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

    // The backend returns the full session history, but for now we just want to append the new assistant message
    // We can assume the last message in the returned history is the assistant's response
    const assistantResponse = response.messages[response.messages.length - 1];

    if (assistantResponse && assistantResponse.role === 'assistant') {
      setMessages(prev => [...prev, assistantResponse]);
    }
  };

  const handleTestWidget = () => {
    const mockData = {
      "schema_version": "1.0",
      "widget_type": "polymarket_instrument_chart",
      "instrument": {
        "entity_type": "event",
        "id": "0x123...",
        "slug": "us-election-2024",
        "title": "Who will win the 2024 US Election?",
        "url": "https://polymarket.com/event/us-election-2024",
        "category": "Politics",
        "tags": ["US", "Election"],
        "status": "open",
        "created_at": "2024-01-01T00:00:00Z",
        "end_time": "2024-11-05T00:00:00Z",
        "resolution": {
          "resolved": false,
          "resolution_time": null,
          "winning_outcome_id": null,
          "source": null
        },
        "metrics": {
          "base_currency": "USDC",
          "total_volume_usd": 15000000,
          "open_interest_usd": 5000000,
          "liquidity_usd": 2500000,
          "num_traders": 12000
        }
      },
      "chart": {
        "granularity": "1d",
        "from": "2024-11-01T00:00:00Z",
        "to": "2024-11-29T12:00:00Z",
        "timezone": "UTC"
      },
      "outcomes": [
        {
          "outcome_id": "outcome-1",
          "label": "Trump",
          "token_address": "0x...",
          "color_hint": 1, // Red
          "current_price": 0.52,
          "current_probability": 0.52,
          "price_24h_ago": 0.50,
          "price_24h_change_abs": 0.02,
          "price_24h_change_pct": 4.00,
          "volume_24h_usd": 500000,
          "is_winner": false,
          "is_tradable": true
        },
        {
          "outcome_id": "outcome-2",
          "label": "Harris",
          "token_address": "0x...",
          "color_hint": 2, // Blue
          "current_price": 0.47,
          "current_probability": 0.47,
          "price_24h_ago": 0.48,
          "price_24h_change_abs": -0.01,
          "price_24h_change_pct": -2.08,
          "volume_24h_usd": 450000,
          "is_winner": false,
          "is_tradable": true
        }
      ],
      "series": [
        {
          "outcome_id": "outcome-1",
          "points": [
            { "t": 1732800000000, "p": 0.51, "v": 1000 },
            { "t": 1732810000000, "p": 0.52, "v": 1200 }
          ]
        },
        {
          "outcome_id": "outcome-2",
          "points": [
            { "t": 1732800000000, "p": 0.48, "v": 900 },
            { "t": 1732810000000, "p": 0.47, "v": 850 }
          ]
        }
      ]
    };

    const mockToolCall: ToolCall = {
      id: 'call_123',
      type: 'function',
      function: {
        name: 'render_polymarket_widget',
        arguments: JSON.stringify(mockData)
      }
    };

    const mockMessage: Message = {
      role: 'assistant',
      content: "Here is the market data you requested:",
      toolCalls: [mockToolCall],
      timestamp: Date.now() / 1000
    };
    setMessages(prev => [...prev, mockMessage]);
  };

  return (
    <main className="chat-area">
      <button
        onClick={handleTestWidget}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 100,
          padding: '8px 16px',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)'
        }}
      >
        Test Widget
      </button>
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
                      <div className="sender-name">Orecce</div>

                      {/* Render Text Content if present */}
                      {msg.content && <div className="message-text">{msg.content}</div>}

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
                  <div className="sender-name">Orecce</div>
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

      `}</style>
    </main>
  );
}
