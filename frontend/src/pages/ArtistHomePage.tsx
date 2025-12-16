import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createRelease, listReleases } from '../api/client';
import type { ReleaseRow } from '../api/types';
import { useAuth } from '../auth/auth';

export function ArtistHomePage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<ReleaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const draftCount = useMemo(() => items.filter((r) => r.status === 'DRAFT').length, [items]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await listReleases(token);
        if (!cancelled) setItems(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load releases');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="container">
      <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h2>Artist Dashboard</h2>
          <p className="muted">Drafts: {draftCount}</p>
        </div>
        <button
          className="button primary"
          onClick={async () => {
            if (!token) return;
            const title = 'Untitled Release';
            const genre = 'Unknown';
            try {
              const created = await createRelease(token, { title, genre });
              navigate(`/artist/releases/${created.id}/wizard/details`);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Failed to create release');
            }
          }}
        >
          New release
        </button>
      </div>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      {loading ? (
        <div className="muted">Loading…</div>
      ) : (
        <div className="card">
          {items.length === 0 ? (
            <div className="muted">No releases yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Genre</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.genre}</td>
                    <td>{r.status}</td>
                    <td>
                      <Link className="button" to={`/artist/releases/${r.id}/wizard/details`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
