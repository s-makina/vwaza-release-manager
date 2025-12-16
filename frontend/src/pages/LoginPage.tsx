import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import { parseJwtPayload, useAuth } from '../auth/auth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { setToken } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container">
      <h2>Login</h2>
      <div className="card" style={{ maxWidth: 420 }}>
        <div style={{ marginBottom: 12 }}>
          <label className="label">Email</label>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="artist@example.com"
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="label">Password</label>
          <input
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
          />
        </div>
        {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}
        <button
          className="button primary"
          disabled={loading || !email || !password}
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const res = await login({ email, password });
              setToken(res.token);
              const payload = parseJwtPayload(res.token);
              navigate(payload?.role === 'ADMIN' ? '/admin' : '/artist');
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Login failed');
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          You can create an ARTIST user via POST <code>/auth/register</code> in the backend.
        </p>
      </div>
    </div>
  );
}
