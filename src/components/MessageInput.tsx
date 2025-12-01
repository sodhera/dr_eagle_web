import React, { useRef, useEffect } from 'react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export default function MessageInput({ value, onChange, onSend, disabled }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="input-container">
      <div className="input-box">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="How can I help you today?"
          rows={1}
          className="message-input"
          disabled={disabled}
        />
        <div className="input-actions">
          <div className="left-actions">
            <button className="action-btn" aria-label="Add Attachment">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="right-actions">
            <button
              className={`send-btn ${!value.trim() ? 'disabled' : ''}`}
              aria-label="Send Message"
              onClick={onSend}
              disabled={!value.trim() || disabled}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .input-container {
          width: 100%;
          max-width: 768px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .input-box {
          background-color: #ffffff; /* Solid white background */
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); /* Elevated shadow */
        }

        .message-input {
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 1rem;
          resize: none;
          outline: none;
          min-height: 24px;
          max-height: 200px;
        }

        .message-input::placeholder {
          color: var(--text-secondary);
        }

        .input-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .action-btn {
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .send-btn {
          background: var(--accent-primary);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s, opacity 0.2s;
        }

        .send-btn:hover:not(.disabled) {
          background: var(--accent-hover);
        }

        .send-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
