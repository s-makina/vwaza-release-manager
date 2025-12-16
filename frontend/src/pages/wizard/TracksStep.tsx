import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { createTrack, listTracks } from '../../api/client';
import type { TrackRow } from '../../api/types';
import { uploadFileWithProgress, type UploadProgress } from '../../api/uploads';
import { useAuth } from '../../auth/auth';
import type { WizardOutletContext } from './wizardContext';

export function TracksStep() {
  const { token } = useAuth();
  const { releaseId } = useParams();
  const navigate = useNavigate();
  useOutletContext<WizardOutletContext>();

  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [isrc, setIsrc] = useState('');
  const [duration, setDuration] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const [uploadingTrackId, setUploadingTrackId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});

  const canCreate = useMemo(() => Boolean(title.trim() && isrc.trim().length === 12 && !creating), [title, isrc, creating]);

  async function refresh() {
    if (!token || !releaseId) return;
    const res = await listTracks(token, releaseId);
    setTracks(res);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token || !releaseId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await listTracks(token, releaseId);
        if (!cancelled) setTracks(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load tracks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token, releaseId]);

  return (
    <div className="card">
      <h3>Tracks</h3>
      <p className="muted">Create tracks, then upload audio for each track.</p>

      <div className="row" style={{ gap: 16, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label className="label">Track title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={{ width: 180 }}>
          <label className="label">ISRC (12 chars)</label>
          <input className="input" value={isrc} onChange={(e) => setIsrc(e.target.value.toUpperCase())} />
        </div>
        <div style={{ width: 160 }}>
          <label className="label">Duration (sec)</label>
          <input
            className="input"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            inputMode="numeric"
          />
        </div>
        <div style={{ alignSelf: 'end' }}>
          <button
            className="button primary"
            disabled={!token || !releaseId || !canCreate}
            onClick={async () => {
              if (!token || !releaseId) return;
              setCreating(true);
              setError(null);
              try {
                const dur = duration.trim() ? Number(duration.trim()) : undefined;
                const created = await createTrack(token, releaseId, {
                  title: title.trim(),
                  isrc: isrc.trim(),
                  ...(dur ? { duration: dur } : {})
                });
                setTracks((prev) => [...prev, created]);
                setTitle('');
                setIsrc('');
                setDuration('');
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Failed to create track');
              } finally {
                setCreating(false);
              }
            }}
          >
            {creating ? 'Adding…' : 'Add track'}
          </button>
        </div>
      </div>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}
      {loading ? <div className="muted">Loading…</div> : null}

      {tracks.length === 0 ? (
        <div className="muted">No tracks yet.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>ISRC</th>
              <th>Audio</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.isrc}</td>
                <td>
                  {t.audio_public_url ? (
                    <a href={t.audio_public_url} target="_blank" rel="noreferrer">
                      Uploaded
                    </a>
                  ) : (
                    <span className="muted">Missing</span>
                  )}
                  {uploadProgress[t.id] ? (
                    <div style={{ marginTop: 6 }}>
                      <div className="progress">
                        <div style={{ width: `${uploadProgress[t.id]?.percent ?? 0}%` }} />
                      </div>
                      <div className="muted" style={{ marginTop: 4 }}>
                        {uploadProgress[t.id]?.percent ?? 0}%
                      </div>
                    </div>
                  ) : null}
                </td>
                <td>
                  <input
                    type="file"
                    accept="audio/*"
                    disabled={!token || !releaseId || uploadingTrackId === t.id}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !token || !releaseId) return;
                      setUploadingTrackId(t.id);
                      setError(null);
                      try {
                        await uploadFileWithProgress({
                          path: `/storage/upload/track-audio/${releaseId}/${t.id}`,
                          token,
                          file,
                          onProgress: (p) =>
                            setUploadProgress((prev) => ({
                              ...prev,
                              [t.id]: p
                            }))
                        });
                        await refresh();
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : 'Upload failed');
                      } finally {
                        setUploadingTrackId(null);
                      }
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="button primary"
          disabled={!releaseId}
          onClick={() => navigate(`/artist/releases/${releaseId}/wizard/submit`)}
        >
          Continue
        </button>
        <button
          className="button"
          onClick={async () => {
            setError(null);
            try {
              await refresh();
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Failed to refresh');
            }
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
