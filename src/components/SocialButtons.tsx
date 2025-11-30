'use client';

import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export default function SocialButtons() {
    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
        }
    };

    const handlePlaceholderLogin = (provider: string) => {
        console.log(`Login with ${provider} clicked`);
    };

    return (
        <div className="social-buttons-container">
            <button className="social-btn" onClick={handleGoogleLogin}>
                <span className="icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                </span>
                Continue with Google
            </button>

            <button className="social-btn" onClick={() => handlePlaceholderLogin('Apple')}>
                <span className="icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24.02-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.02 4.11-.72 1.53.28 2.51.82 3.19 1.83-2.99 1.86-2.47 6.08.58 7.34-.63 1.55-1.57 3.09-2.96 3.78zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                </span>
                Continue with Apple
            </button>

            <button className="social-btn" onClick={() => handlePlaceholderLogin('Binance')}>
                <span className="icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.624 13.832l2.717-2.716-2.717-2.717-1.973 1.973 2.717 2.717-2.717 2.717 1.973 1.973zm-4.624-4.624l-2.716 2.717 2.716 2.717 2.717-2.717-2.717-2.717zm-4.624 4.624l-2.717-2.716 2.717-2.717 1.973 1.973-2.717 2.717 2.717 2.717-1.973 1.973zm4.624 4.624l2.717 2.716 2.717-2.716-1.973-1.973-2.717 2.717-2.717-2.717-1.973 1.973zm0-9.248l-2.717-2.716-2.717 2.716 1.973 1.973 2.717-2.717 2.717 2.717 1.973-1.973z" />
                    </svg>
                </span>
                Continue with Binance
            </button>

            <button className="social-btn" onClick={() => handlePlaceholderLogin('Wallet')}>
                <span className="icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                    </svg>
                </span>
                Continue with Wallet
            </button>

            <style jsx>{`
        .social-buttons-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
        }

        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem;
          background-color: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #1f2937;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: var(--font-sans);
        }

        .social-btn:hover {
          background-color: #f9fafb;
          border-color: #d1d5db;
        }

        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
        </div>
    );
}
