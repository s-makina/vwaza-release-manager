import { pool } from '../../db/pool';

export type PendingReviewReleaseRow = {
  id: string;
  artist_id: string;
  artist_email: string;
  title: string;
  genre: string;
  status: 'PENDING_REVIEW';
  cover_art_public_url: string | null;
  created_at: string;
};

export type ReviewReleaseResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'not_pending_review' };

export type TrackAudioRef = {
  track_id: string;
  release_id: string;
  audio_object_key: string;
};

export async function listPendingReviewReleases(): Promise<PendingReviewReleaseRow[]> {
  const result = await pool.query<PendingReviewReleaseRow>(
    `
    SELECT
      r.id,
      r.artist_id,
      u.email AS artist_email,
      r.title,
      r.genre,
      r.status,
      r.cover_art_public_url,
      r.created_at
    FROM releases r
    JOIN users u ON u.id = r.artist_id
    WHERE r.status = 'PENDING_REVIEW'
    ORDER BY r.created_at ASC
    `
  );

  return result.rows;
}

async function reviewRelease(params: {
  releaseId: string;
  nextStatus: 'PUBLISHED' | 'REJECTED';
}): Promise<ReviewReleaseResult> {
  const result = await pool.query<{ target_count: string; updated_count: string }>(
    `
    WITH target AS (
      SELECT 1
      FROM releases
      WHERE id = $1
    ),
    updated AS (
      UPDATE releases
      SET status = $2
      WHERE id = $1
        AND status = 'PENDING_REVIEW'
      RETURNING 1
    )
    SELECT
      (SELECT COUNT(*)::text FROM target) AS target_count,
      (SELECT COUNT(*)::text FROM updated) AS updated_count
    `,
    [params.releaseId, params.nextStatus]
  );

  const row = result.rows[0];
  const targetCount = Number.parseInt(row?.target_count ?? '0', 10);
  const updatedCount = Number.parseInt(row?.updated_count ?? '0', 10);

  if (targetCount === 0) return { ok: false, reason: 'not_found' };
  if (updatedCount > 0) return { ok: true };
  return { ok: false, reason: 'not_pending_review' };
}

export async function approveRelease(params: { releaseId: string }): Promise<ReviewReleaseResult> {
  return reviewRelease({ releaseId: params.releaseId, nextStatus: 'PUBLISHED' });
}

export async function rejectRelease(params: { releaseId: string }): Promise<ReviewReleaseResult> {
  return reviewRelease({ releaseId: params.releaseId, nextStatus: 'REJECTED' });
}

export async function getPendingReviewTrackAudioRef(params: {
  trackId: string;
}): Promise<TrackAudioRef | null> {
  const result = await pool.query<TrackAudioRef>(
    `
    SELECT t.id AS track_id, t.release_id, t.audio_object_key
    FROM tracks t
    JOIN releases r ON r.id = t.release_id
    WHERE t.id = $1
      AND r.status = 'PENDING_REVIEW'
      AND t.audio_object_key IS NOT NULL
    `,
    [params.trackId]
  );

  return result.rows[0] ?? null;
}
