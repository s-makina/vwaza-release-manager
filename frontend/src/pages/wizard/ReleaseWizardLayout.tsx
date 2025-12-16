import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getRelease } from '../../api/client';
import type { ReleaseRow } from '../../api/types';
import { useAuth } from '../../auth/auth';

const steps = [
  { key: 'details', label: 'Details' },
  { key: 'cover', label: 'Cover art' },
  { key: 'tracks', label: 'Tracks' },
  { key: 'submit', label: 'Submit' },
  { key: 'status', label: 'Status' }
] as const;

export function ReleaseWizardLayout() {
  const { token } = useAuth();
  const { releaseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [release, setRelease] = useState<ReleaseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(() => {
    const parts = location.pathname.split('/');
    const last = parts[parts.length - 1];
    return steps.find((s) => s.key === last)?.key ?? 'details';
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token || !releaseId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getRelease(token, releaseId);
        if (!cancelled) setRelease(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load release');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token, releaseId]);

  const refreshRelease = useCallback(async () => {
    if (!token || !releaseId) return;
    const res = await getRelease(token, releaseId);
    setRelease(res);
  }, [token, releaseId]);

  if (!releaseId) {
    return (
      <div className="container">
        <div className="error">Missing release id</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Release Wizard</h2>
          <div className="muted">
            <span>{release?.title ?? '…'}</span>
            <span> — </span>
            <span>Status: {release?.status ?? '…'}</span>
          </div>
        </div>
        <button className="button" onClick={() => navigate('/artist')}>
          Back to dashboard
        </button>
      </div>

      <div className="steps">
        {steps.map((s) => (
          <Link
            key={s.key}
            className={`step ${active === s.key ? 'active' : ''}`}
            to={`/artist/releases/${releaseId}/wizard/${s.key}`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {loading ? <div className="muted">Loading…</div> : null}
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <Outlet context={{ release, refreshRelease }} />
    </div>
  );
}
