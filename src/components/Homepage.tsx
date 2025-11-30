'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Homepage() {
  const [showCapsule, setShowCapsule] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowCapsule(true);
      } else {
        setShowCapsule(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="homepage-container">
      <nav className={`navbar ${showCapsule ? 'hidden' : ''}`}>
        <div className="logo">Orecce</div>
        <div className="nav-actions">
          <Link href="/login">
            <button className="lets-try-btn">Let's try</button>
          </Link>
        </div>
      </nav>

      <div className={`capsule-navbar ${showCapsule ? 'visible' : ''}`}>
        <div className="capsule-logo">Orecce</div>
        <div className="capsule-links">
          <a href="#about">About Us</a>
          <a href="#security">Security</a>
        </div>
        <Link href="/login">
          <button className="capsule-btn">Let's try</button>
        </Link>
      </div>

      <main className="hero-section">
        {/* Placeholder for future content */}
        <h1>Your personal Tracker</h1>
      </main>

      <section className="content-section">
        <h2>Placeholder Section 1</h2>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      </section>

      <section className="content-section">
        <h2>Placeholder Section 2</h2>
        <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      </section>

      <section className="content-section">
        <h2>Placeholder Section 3</h2>
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      </section>

      <style jsx>{`
        .homepage-container {
          min-height: 100vh;
          background-color: #f8f9fa; /* Light background */
          color: #333;
          font-family: var(--font-sans);
        }

        .navbar {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          background-color: transparent;
          transition: opacity 0.3s ease;
          z-index: 10;
        }

        .navbar.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .logo {
          font-family: var(--font-serif);
          font-size: 1.5rem;
          font-weight: bold;
          color: #000;
        }

        .lets-try-btn {
          background-color: #000;
          color: #fff;
          border: none;
          padding: 0.6rem 1.2rem;
          border-radius: 20px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s;
          font-family: var(--font-sans);
        }

        .lets-try-btn:hover {
          background-color: #333;
        }

        /* Capsule Navbar Styles */
        .capsule-navbar {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%) translateY(-100px);
          display: flex;
          align-items: center;
          gap: 2rem;
          padding: 0.5rem 1rem 0.5rem 1.5rem;
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-radius: 50px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1000;
          border: 1px solid rgba(255, 255, 255, 0.5);
        }

        .capsule-navbar.visible {
          transform: translateX(-50%) translateY(0);
        }

        .capsule-logo {
          font-family: var(--font-serif);
          font-weight: bold;
          font-size: 1.1rem;
          color: #000;
        }

        .capsule-links {
          display: flex;
          gap: 1.5rem;
        }

        .capsule-links a {
          color: #555;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s;
        }

        .capsule-links a:hover {
          color: #000;
        }

        .capsule-btn {
          background-color: #000;
          color: #fff;
          border: none;
          padding: 0.5rem 1.2rem;
          border-radius: 20px;
          font-size: 0.85rem;
          cursor: pointer;
          font-family: var(--font-sans);
          transition: transform 0.2s;
        }

        .capsule-btn:hover {
          transform: scale(1.05);
        }

        .hero-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
        }
        
        h1 {
            font-family: var(--font-serif);
            font-weight: bold;
            font-style: normal;
        }

        .content-section {
          padding: 4rem 2rem;
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .content-section h2 {
          font-family: var(--font-serif);
          margin-bottom: 1rem;
        }

        .content-section p {
          line-height: 1.6;
          color: #666;
        }
      `}</style>
    </div>
  );
}
