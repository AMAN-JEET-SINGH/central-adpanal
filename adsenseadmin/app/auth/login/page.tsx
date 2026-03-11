'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import './login.css';

export default function AdminLogin() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard/admin-users');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Top gradient bar */}
      <div className="login-top-bar" />

      <div className="login-content">
        {/* Left illustration panel */}
        <div className="login-illustration login-animate-left">
          <div className="login-illustration-content">
            <div className="login-illustration-icon">
              <svg viewBox="0 0 120 120" fill="none">
                <rect x="10" y="20" width="100" height="80" rx="8" stroke="#0099ff" strokeWidth="3" fill="none" />
                <rect x="20" y="35" width="35" height="8" rx="4" fill="#0099ff" opacity="0.3" />
                <rect x="20" y="50" width="80" height="4" rx="2" fill="#0055cc" opacity="0.2" />
                <rect x="20" y="60" width="60" height="4" rx="2" fill="#0055cc" opacity="0.2" />
                <rect x="20" y="70" width="70" height="4" rx="2" fill="#0055cc" opacity="0.2" />
                <circle cx="85" cy="38" r="12" fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="2" />
                <path d="M80 38l4 4 8-8" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="20" y="82" width="24" height="8" rx="4" fill="#6600cc" opacity="0.3" />
                <rect x="50" y="82" width="24" height="8" rx="4" fill="#0099ff" opacity="0.3" />
              </svg>
            </div>
            <h2 className="login-illustration-title">Adsense Admin Panel</h2>
            <p className="login-illustration-subtitle">Manage your Adsense accounts, view reports, and track revenue all in one place.</p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="login-form-panel login-animate-right">
          <div className="login-form-wrapper">
            <h1>Welcome Back!</h1>
            <p className="login-subtitle">Sign in to your Admin Account</p>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group login-animate-input" style={{ animationDelay: '0.15s' }}>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Username"
                  disabled={loading}
                />
              </div>

              <div className="input-group login-animate-input" style={{ animationDelay: '0.25s' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  disabled={loading}
                  className="has-toggle"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="remember-forgot-row">
                <div className="checkbox-row">
                  <input type="checkbox" id="remember" />
                  <label htmlFor="remember">Remember me</label>
                </div>
              </div>

              <button type="submit" className="btn-signin" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
