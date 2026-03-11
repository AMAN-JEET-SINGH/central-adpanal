'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isLoggedIn: boolean;
  loading: boolean;
  username: string | null;
  role: 'superadmin' | 'admin' | null;
  userId: string | null;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<'superadmin' | 'admin' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check localStorage for existing session
    const stored = localStorage.getItem('adsense-admin-auth');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setIsLoggedIn(true);
        setUsername(data.email || 'Admin');
        setRole(data.role || null);
        setUserId(data.userId || null);
        setIsSuperAdmin(data.isSuperAdmin || false);
      } catch {
        localStorage.removeItem('adsense-admin-auth');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const res = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as Record<string, string>).error || 'Login failed');
    }

    const responseData = await res.json();

    const authData = {
      email,
      role: responseData.role || 'admin',
      userId: responseData.userId || null,
      isSuperAdmin: responseData.isSuperAdmin || false,
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem('adsense-admin-auth', JSON.stringify(authData));
    setIsLoggedIn(true);
    setUsername(email);
    setRole(authData.role);
    setUserId(authData.userId);
    setIsSuperAdmin(authData.isSuperAdmin);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('adsense-admin-auth');
    setIsLoggedIn(false);
    setUsername(null);
    setRole(null);
    setUserId(null);
    setIsSuperAdmin(false);
    router.push('/auth/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, loading, username, role, userId, isSuperAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
