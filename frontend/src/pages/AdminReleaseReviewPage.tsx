import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  approvePendingReviewRelease,
  listPendingReviewReleaseTracks,
  listPendingReviewReleases,
  rejectPendingReviewRelease
} from '../api/client';
import type { PendingReviewReleaseRow, PendingReviewTrackRow } from '../api/types';
import { useAuth } from '../auth/auth';
import { AdminTrackAudioPlayer } from '../ui/AdminTrackAudioPlayer';

export function AdminReleaseReviewPage() {
  const { token } = useAuth();
  const { releaseId } = useParams();
  const navigate = useNavigate();

  const [release, setRelease] = useState<PendingReviewReleaseRow | null>(null);
  const [tracks, setTracks] = useState<PendingReviewTrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const playableCount = useMemo(
    () => tracks.filter((t) => Boolean(t.audio_public_url || t.audio_object_key)).length,
    [tracks]
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token || !releaseId) return;
      setLoading(true);
      setError(null);
      try {
        const [releases, t] = await Promise.all([
          listPendingReviewReleases(token),
          listPendingReviewReleaseTracks(token, releaseId)
        ]);
        if (cancelled) return;
        setRelease(releases.find((r) => r.id === releaseId) ?? null);
        setTracks(t);
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

  async function doAction(action: 'approve' | 'reject') {
    if (!token || !releaseId) return;
    setSubmitting(true);
    setError(null);
    try {
      if (action === 'approve') {
        await approvePendingReviewRelease(token, releaseId);
      } else {
        await rejectPendingReviewRelease(token, releaseId);
      }
      navigate('/admin');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h2>Review Release</h2>
          <p className="muted">
            {release ? (
              <>
                <strong>{release.title}</strong> by {release.artist_email} • {release.genre}
              </>
            ) : (
              <>{releaseId}</>
            )}
          </p>
          <p className="muted">Tracks: {tracks.length} • Playable: {playableCount}</p>
        </div>
        <div className="row">
          <button className="button" onClick={() => navigate('/admin')}>Back</button>
          <button
            className="button"
            disabled={submitting || !token || !releaseId}
            onClick={() => doAction('reject')}
          >
            {submitting ? 'Working…' : 'Reject'}
          </button>
          <button
            className="button primary"
            disabled={submitting || !token || !releaseId}
            onClick={() => doAction('approve')}
          >
            {submitting ? 'Working…' : 'Approve'}
          </button>
        </div>
      </div>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      {loading ? (
        <div className="muted">Loading…</div>
      ) : (
        <div className="card">
          {tracks.length === 0 ? (
            <div className="muted">No tracks found.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>ISRC</th>
                  <th>Duration</th>
                  <th>Audio</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((t) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{t.isrc}</td>
                    <td>{t.duration ?? '—'}</td>
                    <td>
                      {t.audio_public_url ? (
                        <audio controls preload="metadata" src={t.audio_public_url} style={{ width: '100%', minWidth: 260 }} />
                      ) : t.audio_object_key ? (
                        <AdminTrackAudioPlayer trackId={t.id} />
                      ) : (
                        <span className="muted">Missing</span>
                      )}
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
