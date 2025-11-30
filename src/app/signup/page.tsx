'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AuthLayout from '@/components/AuthLayout';
import SocialButtons from '@/components/SocialButtons';

export default function SignupPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, {
                displayName: name
            });
            router.push('/');
        } catch (err: any) {
            console.error("Error signing up", err);
            setError(err.message || "Failed to create account.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout mode="signup">
            <div className="form-container">
                <h1 className="title">Create an account</h1>
                <p className="subtitle">Please enter your details to create an account.</p>

                <SocialButtons />

                <div className="divider">
                    <span>OR</span>
                </div>

                {error && <p className="error-message">{error}</p>}

                <form onSubmit={handleSignup}>
                    <div className="input-group">
                        <label>Name</label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

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
                        {loading ? 'Creating account...' : 'Create an account'}
                    </button>

                    <div className="checkbox-group">
                        <input type="checkbox" id="updates" />
                        <label htmlFor="updates">
                            Please keep me updated by email with the latest news, research findings, reward programs, event updates.
                        </label>
                    </div>
                </form>

                <div className="footer">
                    Already have an account? <Link href="/login" className="link">Sign in</Link>
                </div>
            </div>

            <style jsx>{`
                .form-container {
                    width: 100%;
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

                .checkbox-group {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                    font-size: 0.8rem;
                    color: #666;
                    line-height: 1.4;
                }

                .checkbox-group input {
                    margin-top: 0.2rem;
                }

                .footer {
                    text-align: center;
                    margin-top: 2rem;
                    font-size: 0.9rem;
                    color: #666;
                }

                .link {
                    color: #000;
                    font-weight: 600;
                    text-decoration: underline;
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
