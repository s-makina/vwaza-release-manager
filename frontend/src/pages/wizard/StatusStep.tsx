import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { getRelease } from '../../api/client';
import type { ReleaseRow } from '../../api/types';
import { useAuth } from '../../auth/auth';
import type { WizardOutletContext } from './wizardContext';

export function StatusStep() {
  const { token } = useAuth();
  const { releaseId } = useParams();
  const { release, refreshRelease } = useOutletContext<WizardOutletContext>();

  const [latest, setLatest] = useState<ReleaseRow | null>(release);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = useMemo(() => {
    const status = latest?.status;
    return status === 'PENDING_REVIEW' || status === 'PUBLISHED' || status === 'REJECTED';
  }, [latest]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function tick() {
      if (!token || !releaseId) return;
      try {
        const r = await getRelease(token, releaseId);
        if (!cancelled) {
          setLatest(r);
          setError(null);
        }
        if (!cancelled && (r.status === 'PENDING_REVIEW' || r.status === 'PUBLISHED' || r.status === 'REJECTED')) {
          if (timer) window.clearInterval(timer);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to poll status');
      }
    }

    void tick();
    timer = window.setInterval(() => {
      void tick();
    }, 3000);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [token, releaseId]);

  useEffect(() => {
    void refreshRelease();
  }, [refreshRelease]);

  return (
    <div className="card">
      <h3>Status</h3>
      <p className="muted">This page polls <code>GET /releases/:id</code> every 3 seconds.</p>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div style={{ marginBottom: 12 }}>
        <div><strong>Current status</strong></div>
        <div style={{ fontSize: 18 }}>{latest?.status ?? '…'}</div>
      </div>

      {latest?.status === 'PROCESSING' ? (
        <div className="muted">Processing…</div>
      ) : null}

      {isTerminal ? (
        <div>
          <div className="muted">Processing finished.</div>
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="button"
          onClick={async () => {
            setError(null);
            try {
              await refreshRelease();
              if (token && releaseId) {
                const r = await getRelease(token, releaseId);
                setLatest(r);
              }
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Refresh failed');
            }
          }}
        >
          Refresh now
        </button>
      </div>
    </div>
  );
}
