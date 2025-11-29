import React from 'react';
import MessageInput from './MessageInput';
import Dashboard from './Dashboard';
import { useAuth } from '@/context/AuthContext';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export default function WelcomeScreen({ onSuggestionClick, inputValue, onInputChange, onSend }: WelcomeScreenProps) {
  const { user } = useAuth();
  const displayName = user?.displayName?.split(' ')[0] || 'there';

  return (
    <div className="welcome-container">
      <div className="greeting-section">
        <h1 className="greeting-text">Hey {displayName}!</h1>
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
