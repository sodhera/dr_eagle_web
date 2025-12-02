'use client';

import React from 'react';
import bgImage from '../../public/login-bg.png';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LoginIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M9 3h3.5A1.5 1.5 0 0 1 14 4.5v7A1.5 1.5 0 0 1 12.5 13H9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 11l3-3-3-3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 8H3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SignupIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle
      cx="6.5"
      cy="5.5"
      r="2.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2.5 13c.7-1.9 2.4-3.5 4-3.5s3.3 1.6 4 3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12.5 7.5v4m-2-2h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const isSignup = pathname === '/signup';

  return (
    <div className="auth-container">
      {/* Left Side - Image & Testimonial */}
      <div className="auth-visual-side">
        <div className="auth-visual-content">
          <div className="image-overlay"></div>
          <Image
            src={bgImage}
            alt="Auth Background"
            fill
            style={{ objectFit: 'cover' }}
            priority
            placeholder="blur"
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
        <div className="form-content">
          <div className="auth-toggle">
            <Link
              href="/login"
              aria-current={isLogin ? 'page' : undefined}
              className="toggle-link"
            >
              <span className={`toggle-btn ${isLogin ? 'active' : ''}`}>
                <LoginIcon />
                <span>Login</span>
              </span>
            </Link>
            <Link
              href="/signup"
              aria-current={isSignup ? 'page' : undefined}
              className="toggle-link"
            >
              <span className={`toggle-btn ${isSignup ? 'active' : ''}`}>
                <SignupIcon />
                <span>Sign Up</span>
              </span>
            </Link>
          </div>
          <div className="form-wrapper">
            {children}
          </div>
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
          padding: 1.5rem; /* Reduced padding to bring card closer to edge */
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
          width: 100%; /* Ensure it fills the container */
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
          gap: 0.5rem;
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
          justify-content: center;
          align-items: center;
          padding: 1.5rem; /* Reduced padding */
          max-width: 100%;
          background-color: #fff;
          height: 100vh; /* Force full height */
          overflow-y: auto; /* Allow internal scrolling if needed */
        }

        @media (min-width: 1024px) {
            .auth-form-container {
                /* Removed max-width constraint to allow filling the remaining 50% */
            }
        }

        .form-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            max-width: 400px;
            margin: 0 auto;
            width: 100%;
            padding: 2rem 0;
        }

        .form-wrapper {
          flex: 0 0 580px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          width: 100%;
        }

        @media (max-height: 900px) {
          .auth-form-container {
            justify-content: flex-start;
          }

          .form-content {
            justify-content: flex-start;
          }

          .form-wrapper {
            flex: 1;
            height: auto;
          }

          .auth-toggle {
            margin-bottom: 1.5rem;
          }
        }

        .auth-toggle {
          display: inline-flex;
          align-self: center;
          gap: 0.2rem;
          margin-bottom: 6rem;
          padding: 0.18rem;
          border-radius: 12px;
          background: #f8fbff;
          box-shadow: 0 6px 18px rgba(99, 102, 241, 0.08);
        }

        .toggle-link {
          text-decoration: none;
          display: inline-flex;
        }

        .toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.26rem 0.6rem;
          border-radius: 9px;
          border: 1px solid transparent;
          color: #4b5563;
          font-size: 0.78rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .toggle-btn svg {
          width: 16px;
          height: 16px;
        }

        .toggle-btn.active {
          background: #fff;
          border-color: #d1d5db;
          color: #111827;
        }

        .toggle-btn:not(.active) {
          color: #6b7280;
        }

        .toggle-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }
      `}</style>
    </div>
  );
}
