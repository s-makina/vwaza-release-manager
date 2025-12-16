import React, { createContext, useContext, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export type UserRole = 'ARTIST' | 'ADMIN';

type JwtPayload = {
  userId?: string;
  role?: UserRole;
};

export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    const payload = parts[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

type AuthContextValue = {
  token: string | null;
  role: UserRole | null;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'vwaza_token';

export function AuthProvider(props: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const role = useMemo<UserRole | null>(() => {
    if (!token) return null;
    const payload = parseJwtPayload(token);
    return payload?.role ?? null;
  }, [token]);

  const setToken = (next: string | null) => {
    setTokenState(next);
    try {
      if (next) localStorage.setItem(TOKEN_KEY, next);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {}
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      role,
      setToken,
      logout: () => setToken(null)
    }),
    [token, role]
  );

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function RequireAuth(props: { children: React.ReactNode }) {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{props.children}</>;
}

export function RequireRole(props: { role: UserRole; children: React.ReactNode }) {
  const { token, role } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!role || role !== props.role) {
    return (
      <div className="container">
        <h2>Forbidden</h2>
        <p className="muted">You do not have access to this page.</p>
      </div>
    );
  }

  return <>{props.children}</>;
}
