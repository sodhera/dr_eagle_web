'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AuthLayout from '@/components/AuthLayout';
import SocialButtons from '@/components/SocialButtons';

export default function LoginPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Redirect handled by useEffect
        } catch (err: any) {
            console.error("Error logging in", err);
            setError("Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout mode="login">
            <div className="form-container">
                <h1 className="title">Welcome to Orecce</h1>
                <p className="subtitle">Please enter your details to sign in.</p>

                <SocialButtons />

                <div className="divider">
                    <span>OR</span>
                </div>

                {error && <p className="error-message">{error}</p>}

                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>Email address</label>
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Sign in'}
                    </button>
                </form>

                <div className="footer">
                    Don't have an account?{' '}
                    <Link href="/signup" className="footer-link">
                        <span className="footer-link-label">Sign up</span>
                    </Link>
                </div>
            </div>

            <style jsx>{`
                .form-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }

                .title {
                    font-size: 1.8rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: #111;
                    text-align: center;
                    font-family: var(--font-sans);
                }

                .subtitle {
                    color: #666;
                    margin-bottom: 2rem;
                    text-align: center;
                    font-size: 0.95rem;
                }

                .divider {
                    display: flex;
                    align-items: center;
                    text-align: center;
                    margin: 1.5rem 0;
                    color: #999;
                    font-size: 0.8rem;
                }

                .divider::before,
                .divider::after {
                    content: '';
                    flex: 1;
                    border-bottom: 1px solid #e5e7eb;
                }

                .divider span {
                    padding: 0 10px;
                }

                .input-group {
                    margin-bottom: 1.2rem;
                }

                .input-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: #374151;
                }

                .input-group input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    transition: border-color 0.2s;
                    font-family: var(--font-sans);
                }

                .input-group input:focus {
                    outline: none;
                    border-color: #000;
                }

                .submit-btn {
                    width: 100%;
                    padding: 0.8rem;
                    background-color: #1f2937;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 500;
                    cursor: pointer;
                    margin-top: 1rem;
                    margin-bottom: 1.5rem;
                    transition: background-color 0.2s;
                    font-family: var(--font-sans);
                }

                .submit-btn:hover {
                    background-color: #000;
                }

                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .footer {
                    text-align: center;
                    margin-top: auto;
                    padding-top: 2rem;
                    font-size: 0.9rem;
                    color: #666;
                }

                .footer-link {
                    text-decoration: none;
                }

                .footer-link-label {
                    font-weight: 500;
                    color: #000;
                }

                .footer-link-label:hover {
                    color: #111111;
                }

                .error-message {
                    color: #ef4444;
                    font-size: 0.9rem;
                    text-align: center;
                    margin-bottom: 1rem;
                }
            `}</style>
        </AuthLayout>
    );
}
