import React, { useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { listTracks, submitRelease } from '../../api/client';
import type { TrackRow } from '../../api/types';
import { useAuth } from '../../auth/auth';
import type { WizardOutletContext } from './wizardContext';

export function SubmitStep() {
  const { token } = useAuth();
  const { releaseId } = useParams();
  const navigate = useNavigate();
  const { release, refreshRelease } = useOutletContext<WizardOutletContext>();

  const [tracks, setTracks] = useState<TrackRow[] | null>(null);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingCover = useMemo(() => !release?.cover_art_public_url, [release]);
  const missingAudioCount = useMemo(
    () => (tracks ? tracks.filter((t) => !t.audio_public_url).length : null),
    [tracks]
  );

  return (
    <div className="card">
      <h3>Submit</h3>
      <p className="muted">Submitting moves the release into PROCESSING. Status will update via polling.</p>

      <div style={{ marginBottom: 12 }}>
        <div><strong>Checks</strong></div>
        <div className={missingCover ? 'error' : 'muted'}>
          Cover art: {missingCover ? 'Missing' : 'OK'}
        </div>
        <div className="muted">
          Tracks: {tracks ? tracks.length : 'Unknown'}
        </div>
        {missingAudioCount !== null ? (
          <div className={missingAudioCount > 0 ? 'error' : 'muted'}>
            Track audio missing: {missingAudioCount}
          </div>
        ) : null}
      </div>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="row">
        <button
          className="button"
          disabled={!token || !releaseId || loadingTracks}
          onClick={async () => {
            if (!token || !releaseId) return;
            setLoadingTracks(true);
            setError(null);
            try {
              const res = await listTracks(token, releaseId);
              setTracks(res);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Failed to load tracks');
            } finally {
              setLoadingTracks(false);
            }
          }}
        >
          {loadingTracks ? 'Checking…' : 'Check tracks'}
        </button>

        <button
          className="button primary"
          disabled={!token || !releaseId || submitting}
          onClick={async () => {
            if (!token || !releaseId) return;
            setSubmitting(true);
            setError(null);
            try {
              await submitRelease(token, releaseId);
              await refreshRelease();
              navigate(`/artist/releases/${releaseId}/wizard/status`);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Submit failed');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? 'Submitting…' : 'Submit release'}
        </button>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="button" onClick={() => navigate(`/artist/releases/${releaseId}/wizard/tracks`)}>
          Back
        </button>
      </div>
    </div>
  );
}
