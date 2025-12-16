import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPendingReviewReleases } from '../api/client';
import type { PendingReviewReleaseRow } from '../api/types';
import { useAuth } from '../auth/auth';

export function AdminReviewQueuePage() {
  const { token } = useAuth();

  const [items, setItems] = useState<PendingReviewReleaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await listPendingReviewReleases(token);
        if (!cancelled) setItems(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load pending releases');
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
          <h2>Admin Dashboard</h2>
          <p className="muted">Pending review: {items.length}</p>
        </div>
      </div>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      {loading ? (
        <div className="muted">Loading…</div>
      ) : (
        <div className="card">
          {items.length === 0 ? (
            <div className="muted">No releases pending review.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Release</th>
                  <th>Artist</th>
                  <th>Genre</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="row" style={{ alignItems: 'center', gap: 12 }}>
                        {r.cover_art_public_url ? (
                          <img
                            src={r.cover_art_public_url}
                            alt={r.title}
                            style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                          />
                        ) : null}
                        <div>
                          <div>{r.title}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{r.status}</div>
                        </div>
                      </div>
                    </td>
                    <td>{r.artist_email}</td>
                    <td>{r.genre}</td>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                    <td>
                      <Link className="button primary" to={`/admin/releases/${r.id}`}>Review</Link>
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
