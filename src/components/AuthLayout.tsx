'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
  mode: 'login' | 'signup';
}

export default function AuthLayout({ children, mode }: AuthLayoutProps) {
  return (
    <div className="auth-container">
      {/* Left Side - Image & Testimonial */}
      <div className="auth-visual-side">
        <div className="auth-visual-content">
          <div className="image-overlay"></div>
          <Image
            src="/login-bg.png" // Using existing background or placeholder
            alt="Auth Background"
            fill
            style={{ objectFit: 'cover' }}
            priority
          />

          <div className="testimonial-card">
            <p className="testimonial-text">
              “App makes it easy to invest in real estate using cryptocurrency. Whether I'm buying luxury villas or fractional shares in commercial properties, every transaction is seamless, secure, and transparent.”
            </p>
            <div className="testimonial-author">
              <div>
                <h4 className="author-name">Isabella Garcia</h4>
                <p className="author-role">Layers Capital</p>
                <p className="author-company">Global Real Estate Investment Firm</p>
              </div>
              <div className="testimonial-nav">
                <button className="nav-btn">←</button>
                <button className="nav-btn">→</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="auth-form-container">
        <div className="auth-header">
          {mode === 'login' ? (
            <Link href="/signup" className="toggle-btn">Sign Up</Link>
          ) : (
            <Link href="/login" className="toggle-btn">Login</Link>
          )}
        </div>
        <div className="form-content">
          {children}
        </div>
      </div>

      <style jsx>{`
        .auth-container {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          background-color: #fff;
        }

        .auth-visual-side {
          flex: 1;
          display: none;
          padding: 0.75rem; /* Reduced gap around the image container */
        }

        @media (min-width: 1024px) {
          .auth-visual-side {
            display: flex;
            max-width: 50%;
          }
        }

        .auth-visual-content {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 12px; /* Reduced rounded corners */
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 3rem;
        }

        .image-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%);
            z-index: 1;
        }

        .testimonial-card {
          position: relative;
          z-index: 2;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 2rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          max-width: 600px;
        }

        .testimonial-text {
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          font-weight: 400;
        }

        .testimonial-author {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .author-name {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 0.2rem;
        }

        .author-role {
          font-size: 0.9rem;
          opacity: 0.9;
        }
        
        .author-company {
            font-size: 0.8rem;
            opacity: 0.7;
        }

        .testimonial-nav {
          display: flex;
          gap: 1rem;
        }

        .nav-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.5);
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .auth-form-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 2rem;
          max-width: 100%;
          background-color: #fff;
        }

        @media (min-width: 1024px) {
            .auth-form-container {
                /* Removed max-width constraint to allow filling the remaining 50% */
            }
        }

        .auth-header {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 2rem;
        }

        .toggle-btn {
            padding: 0.5rem 1rem;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            color: #374151;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .toggle-btn:hover {
            background-color: #f9fafb;
        }

        .form-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            max-width: 400px;
            margin: 0 auto;
            width: 100%;
        }
      `}</style>
    </div>
  );
}
