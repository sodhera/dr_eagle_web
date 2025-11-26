import React from 'react';
import MessageInput from './MessageInput';
import Dashboard from './Dashboard';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export default function WelcomeScreen({ onSuggestionClick, inputValue, onInputChange, onSend }: WelcomeScreenProps) {
  return (
    <div className="welcome-container">
      <div className="greeting-section">
        <div className="icon-container">
          <span className="sparkle-icon">✴</span>
        </div>
        <h1 className="greeting-text">Afternoon, Sulav Stern</h1>
      </div>

      <div className="input-section">
        <MessageInput value={inputValue} onChange={onInputChange} onSend={onSend} />
      </div>

      <Dashboard />

      <style jsx>{`
        .welcome-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--spacing-xl);
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          overflow-y: auto;
        }

        .greeting-section {
          text-align: center;
          margin-bottom: var(--spacing-xl);
          margin-top: var(--spacing-xl);
        }

        .icon-container {
          margin-bottom: var(--spacing-md);
        }

        .sparkle-icon {
          font-size: 2rem;
          color: var(--accent-primary);
        }

        .greeting-text {
          font-family: var(--font-serif);
          font-size: 2.5rem;
          font-weight: 400;
          color: var(--text-primary);
        }

        .input-section {
          width: 100%;
          max-width: 768px;
          margin-bottom: var(--spacing-xl);
        }
      `}</style>
    </div>
  );
}
