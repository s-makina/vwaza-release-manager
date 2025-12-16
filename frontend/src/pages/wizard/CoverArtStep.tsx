import React, { useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { uploadFileWithProgress, type UploadProgress } from '../../api/uploads';
import { useAuth } from '../../auth/auth';
import type { WizardOutletContext } from './wizardContext';

export function CoverArtStep() {
  const { token } = useAuth();
  const { releaseId } = useParams();
  const navigate = useNavigate();
  const { release, refreshRelease } = useOutletContext<WizardOutletContext>();

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUpload = useMemo(() => Boolean(token && releaseId && file && !uploading), [token, releaseId, file, uploading]);

  return (
    <div className="card">
      <h3>Cover art</h3>
      <p className="muted">Upload a JPG/PNG. This updates the release while it is in DRAFT.</p>

      {release?.cover_art_public_url ? (
        <div style={{ marginBottom: 12 }}>
          <div className="muted" style={{ marginBottom: 8 }}>Current cover:</div>
          <img
            src={release.cover_art_public_url}
            alt="Cover"
            style={{ maxWidth: 240, borderRadius: 8, border: '1px solid #eee' }}
          />
        </div>
      ) : null}

      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          setProgress(null);
          setError(null);
        }}
      />

      {progress ? (
        <div style={{ marginTop: 12 }}>
          <div className="progress">
            <div style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="muted" style={{ marginTop: 6 }}>{progress.percent}%</div>
        </div>
      ) : null}

      {error ? <div className="error" style={{ marginTop: 12 }}>{error}</div> : null}

      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="button primary"
          disabled={!canUpload}
          onClick={async () => {
            if (!token || !releaseId || !file) return;
            setUploading(true);
            setError(null);
            try {
              await uploadFileWithProgress({
                path: `/storage/upload/cover-art/${releaseId}`,
                token,
                file,
                onProgress: setProgress
              });
              await refreshRelease();
              navigate(`/artist/releases/${releaseId}/wizard/tracks`);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Upload failed');
            } finally {
              setUploading(false);
            }
          }}
        >
          {uploading ? 'Uploading…' : 'Upload & continue'}
        </button>
        <button className="button" onClick={() => navigate(`/artist/releases/${releaseId}/wizard/tracks`)}>
          Skip
        </button>
      </div>
    </div>
  );
}
