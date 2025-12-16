import { pool } from '../../db/pool';

export type TrackRow = {
  id: string;
  release_id: string;
  title: string;
  isrc: string;
  audio_object_key: string | null;
  audio_public_url: string | null;
  created_at: string;
};

export async function createTrack(params: {
  releaseId: string;
  title: string;
  isrc: string;
}): Promise<TrackRow> {
  const result = await pool.query<TrackRow>(
    `
    INSERT INTO tracks (release_id, title, isrc)
    VALUES ($1, $2, $3)
    RETURNING id, release_id, title, isrc, audio_object_key, audio_public_url, created_at
    `,
    [params.releaseId, params.title, params.isrc]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to create track');
  }
  return row;
}

export async function listTracksForRelease(params: {
  releaseId: string;
}): Promise<TrackRow[]> {
  const result = await pool.query<TrackRow>(
    `
    SELECT id, release_id, title, isrc, audio_object_key, audio_public_url, created_at
    FROM tracks
    WHERE release_id = $1
    ORDER BY created_at ASC
    `,
    [params.releaseId]
  );

  return result.rows;
}

export async function updateTrackTitle(params: {
  trackId: string;
  releaseId: string;
  title: string;
}): Promise<boolean> {
  const result = await pool.query(
    `
    UPDATE tracks
    SET title = $1
    WHERE id = $2
      AND release_id = $3
    `,
    [params.title, params.trackId, params.releaseId]
  );

  return (result.rowCount ?? 0) > 0;
}
