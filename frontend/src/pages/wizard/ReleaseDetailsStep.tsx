import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { getRelease, updateRelease } from '../../api/client';
import { useAuth } from '../../auth/auth';
import type { WizardOutletContext } from './wizardContext';

export function ReleaseDetailsStep() {
  const { token } = useAuth();
  const { releaseId } = useParams();
  const navigate = useNavigate();
  const { release, refreshRelease } = useOutletContext<WizardOutletContext>();

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(release?.title ?? '');
    setGenre(release?.genre ?? '');
  }, [release]);

  return (
    <div className="card">
      <h3>Release details</h3>
      <div className="row" style={{ gap: 16 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <label className="label">Genre</label>
          <input className="input" value={genre} onChange={(e) => setGenre(e.target.value)} />
        </div>
      </div>

      {error ? <div className="error" style={{ marginTop: 12 }}>{error}</div> : null}

      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="button primary"
          disabled={saving || !title.trim() || !genre.trim()}
          onClick={async () => {
            if (!token || !releaseId) return;
            setSaving(true);
            setError(null);
            try {
              await updateRelease(token, releaseId, { title: title.trim(), genre: genre.trim() });
              await refreshRelease();
              navigate(`/artist/releases/${releaseId}/wizard/cover`);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Failed to save');
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Saving…' : 'Save & continue'}
        </button>
        <button
          className="button"
          onClick={async () => {
            if (!token || !releaseId) return;
            try {
              const latest = await getRelease(token, releaseId);
              setTitle(latest.title);
              setGenre(latest.genre);
            } catch {}
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
