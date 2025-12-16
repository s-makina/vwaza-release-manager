import { pool } from '../../db/pool';

export type TrackRow = {
  id: string;
  release_id: string;
  title: string;
  isrc: string;
  duration: number | null;
  audio_url: string | null;
  audio_object_key: string | null;
  audio_public_url: string | null;
  created_at: string;
};

export type CreateTrackResult =
  | { ok: true; track: TrackRow }
  | { ok: false; reason: 'release_not_found' | 'release_not_editable' };

export type ListTracksResult =
  | { ok: true; tracks: TrackRow[] }
  | { ok: false; reason: 'release_not_found' };

export type UpdateTrackResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'not_editable' };

export type DeleteTrackResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'not_editable' };

export async function createTrackForArtist(params: {
  artistId: string;
  releaseId: string;
  title: string;
  isrc: string;
  duration?: number;
  audioUrl?: string;
}): Promise<CreateTrackResult> {
  const inserted = await pool.query<TrackRow>(
    `
    INSERT INTO tracks (release_id, title, isrc, duration, audio_url)
    SELECT r.id, $3, $4, $5, $6
    FROM releases r
    WHERE r.id = $1
      AND r.artist_id = $2
      AND r.status = 'DRAFT'
    RETURNING id, release_id, title, isrc, duration, audio_url, audio_object_key, audio_public_url, created_at
    `,
    [
      params.releaseId,
      params.artistId,
      params.title,
      params.isrc,
      params.duration ?? null,
      params.audioUrl ?? null
    ]
  );

  const row = inserted.rows[0];
  if (row) {
    return { ok: true, track: row };
  }

  const owned = await pool.query<{ status: string }>(
    `
    SELECT status
    FROM releases
    WHERE id = $1
      AND artist_id = $2
    `,
    [params.releaseId, params.artistId]
  );

  if (!owned.rows[0]) {
    return { ok: false, reason: 'release_not_found' };
  }

  return { ok: false, reason: 'release_not_editable' };
}

export async function listTracksForArtistRelease(params: {
  artistId: string;
  releaseId: string;
}): Promise<ListTracksResult> {
  const owned = await pool.query<{ ok: number }>(
    `
    SELECT 1::int AS ok
    FROM releases
    WHERE id = $1
      AND artist_id = $2
    `,
    [params.releaseId, params.artistId]
  );

  if (!owned.rows[0]) {
    return { ok: false, reason: 'release_not_found' };
  }

  const result = await pool.query<TrackRow>(
    `
    SELECT id, release_id, title, isrc, duration, audio_url, audio_object_key, audio_public_url, created_at
    FROM tracks
    WHERE release_id = $1
    ORDER BY created_at ASC
    `,
    [params.releaseId]
  );

  return { ok: true, tracks: result.rows };
}

export async function updateTrackForArtist(params: {
  artistId: string;
  trackId: string;
  releaseId: string;
  title: string;
  isrc?: string;
  duration?: number;
  audioUrl?: string;
}): Promise<UpdateTrackResult> {
  const updated = await pool.query(
    `
    UPDATE tracks t
    SET title = $4,
        isrc = COALESCE($5, t.isrc),
        duration = COALESCE($6, t.duration),
        audio_url = COALESCE($7, t.audio_url)
    FROM releases r
    WHERE t.id = $1
      AND t.release_id = r.id
      AND r.id = $2
      AND r.artist_id = $3
      AND r.status = 'DRAFT'
    `,
    [
      params.trackId,
      params.releaseId,
      params.artistId,
      params.title,
      params.isrc ?? null,
      params.duration ?? null,
      params.audioUrl ?? null
    ]
  );

  if ((updated.rowCount ?? 0) > 0) {
    return { ok: true };
  }

  const owned = await pool.query<{ status: string }>(
    `
    SELECT r.status
    FROM tracks t
    JOIN releases r ON r.id = t.release_id
    WHERE t.id = $1
      AND r.id = $2
      AND r.artist_id = $3
    `,
    [params.trackId, params.releaseId, params.artistId]
  );

  if (!owned.rows[0]) {
    return { ok: false, reason: 'not_found' };
  }

  return { ok: false, reason: 'not_editable' };
}

export async function deleteTrackForArtist(params: {
  artistId: string;
  trackId: string;
  releaseId: string;
}): Promise<DeleteTrackResult> {
  const deleted = await pool.query(
    `
    DELETE FROM tracks t
    USING releases r
    WHERE t.id = $1
      AND t.release_id = r.id
      AND r.id = $2
      AND r.artist_id = $3
      AND r.status = 'DRAFT'
    `,
    [params.trackId, params.releaseId, params.artistId]
  );

  if ((deleted.rowCount ?? 0) > 0) {
    return { ok: true };
  }

  const owned = await pool.query<{ status: string }>(
    `
    SELECT r.status
    FROM tracks t
    JOIN releases r ON r.id = t.release_id
    WHERE t.id = $1
      AND r.id = $2
      AND r.artist_id = $3
    `,
    [params.trackId, params.releaseId, params.artistId]
  );

  if (!owned.rows[0]) {
    return { ok: false, reason: 'not_found' };
  }

  return { ok: false, reason: 'not_editable' };
}
