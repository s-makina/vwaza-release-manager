import { pool } from '../../db/pool';
import { releaseProcessingService } from './releaseProcessing.service';

export type ReleaseStatus = 'DRAFT' | 'PROCESSING' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';

export type ReleaseRow = {
  id: string;
  artist_id: string;
  title: string;
  genre: string;
  status: ReleaseStatus;
  cover_art_object_key: string | null;
  cover_art_public_url: string | null;
  created_at: string;
};

export type UpdateReleaseDraftResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'not_editable' };

export type SubmitReleaseResult =
  | { ok: true; state: 'processing_started' | 'already_processing' | 'already_submitted' }
  | { ok: false; reason: 'not_found' | 'not_submittable' };

export async function createRelease(params: {
  artistId: string;
  title: string;
  genre: string;
}): Promise<ReleaseRow> {
  const result = await pool.query<ReleaseRow>(
    `
    INSERT INTO releases (artist_id, title, genre, status)
    VALUES ($1, $2, $3, 'DRAFT')
    RETURNING id, artist_id, title, genre, status, cover_art_object_key, cover_art_public_url, created_at
    `,
    [params.artistId, params.title, params.genre]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to create release');
  }
  return row;
}

export async function getReleaseForArtistById(params: {
  releaseId: string;
  artistId: string;
}): Promise<ReleaseRow | null> {
  const result = await pool.query<ReleaseRow>(
    `
    SELECT id, artist_id, title, genre, status, cover_art_object_key, cover_art_public_url, created_at
    FROM releases
    WHERE id = $1
      AND artist_id = $2
    `,
    [params.releaseId, params.artistId]
  );

  return result.rows[0] ?? null;
}

export async function listReleasesForArtist(params: {
  artistId: string;
}): Promise<ReleaseRow[]> {
  const result = await pool.query<ReleaseRow>(
    `
    SELECT id, artist_id, title, genre, status, cover_art_object_key, cover_art_public_url, created_at
    FROM releases
    WHERE artist_id = $1
    ORDER BY created_at DESC
    `,
    [params.artistId]
  );

  return result.rows;
}

export async function updateReleaseDraft(params: {
  releaseId: string;
  artistId: string;
  title: string;
  genre: string;
}): Promise<UpdateReleaseDraftResult> {
  const result = await pool.query<{
    target_count: string;
    updated_count: string;
  }>(
    `
    WITH target AS (
      SELECT 1
      FROM releases
      WHERE id = $1
        AND artist_id = $2
    ),
    updated AS (
      UPDATE releases
      SET title = $3,
          genre = $4
      WHERE id = $1
        AND artist_id = $2
        AND status = 'DRAFT'
      RETURNING 1
    )
    SELECT
      (SELECT COUNT(*)::text FROM target) AS target_count,
      (SELECT COUNT(*)::text FROM updated) AS updated_count
    `,
    [params.releaseId, params.artistId, params.title, params.genre]
  );

  const row = result.rows[0];
  const targetCount = Number.parseInt(row?.target_count ?? '0', 10);
  const updatedCount = Number.parseInt(row?.updated_count ?? '0', 10);

  if (targetCount === 0) return { ok: false, reason: 'not_found' };
  if (updatedCount > 0) return { ok: true };
  return { ok: false, reason: 'not_editable' };
}

export async function submitRelease(params: {
  releaseId: string;
  artistId: string;
}): Promise<SubmitReleaseResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const found = await client.query<{ status: ReleaseStatus }>(
      `
      SELECT status
      FROM releases
      WHERE id = $1
        AND artist_id = $2
      FOR UPDATE
      `,
      [params.releaseId, params.artistId]
    );

    const currentStatus = found.rows[0]?.status;
    if (!currentStatus) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'not_found' };
    }

    if (currentStatus === 'PENDING_REVIEW' || currentStatus === 'PUBLISHED' || currentStatus === 'REJECTED') {
      await client.query('COMMIT');
      return { ok: true, state: 'already_submitted' };
    }

    if (currentStatus === 'PROCESSING') {
      await client.query('COMMIT');
      return { ok: true, state: 'already_processing' };
    }

    if (currentStatus !== 'DRAFT') {
      await client.query('COMMIT');
      return { ok: false, reason: 'not_submittable' };
    }

    await client.query(
      `
      UPDATE releases
      SET status = 'PROCESSING'
      WHERE id = $1
        AND artist_id = $2
        AND status = 'DRAFT'
      `,
      [params.releaseId, params.artistId]
    );

    await client.query('COMMIT');
    return { ok: true, state: 'processing_started' };
  } catch (error: unknown) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}

export async function submitReleaseAndStartProcessing(params: {
  releaseId: string;
  artistId: string;
}): Promise<SubmitReleaseResult> {
  const result = await submitRelease(params);

  if (result.ok && (result.state === 'processing_started' || result.state === 'already_processing')) {
    releaseProcessingService.enqueue({ releaseId: params.releaseId });
  }

  return result;
}
