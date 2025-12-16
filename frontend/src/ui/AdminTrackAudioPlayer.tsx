import React, { useEffect, useMemo, useState } from 'react';
import { fetchPendingReviewTrackAudioBlob } from '../api/client';
import { useAuth } from '../auth/auth';

export function AdminTrackAudioPlayer(props: { trackId: string }) {
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const canLoad = useMemo(() => Boolean(token && props.trackId && !loading), [token, props.trackId, loading]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  return (
    <div style={{ minWidth: 260 }}>
      {blobUrl ? (
        <audio controls preload="metadata" src={blobUrl} style={{ width: '100%' }} />
      ) : (
        <button
          className="button"
          disabled={!canLoad}
          onClick={async () => {
            if (!token) return;
            setLoading(true);
            setError(null);
            try {
              const blob = await fetchPendingReviewTrackAudioBlob(token, props.trackId);
              const next = URL.createObjectURL(blob);
              setBlobUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return next;
              });
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Failed to load audio');
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? 'Loading…' : 'Load audio'}
        </button>
      )}
      {error ? <div className="error" style={{ marginTop: 6 }}>{error}</div> : null}
    </div>
  );
}
