import { pool } from '../../db/pool';

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

export async function getReleaseById(params: {
  releaseId: string;
}): Promise<ReleaseRow | null> {
  const result = await pool.query<ReleaseRow>(
    `
    SELECT id, artist_id, title, genre, status, cover_art_object_key, cover_art_public_url, created_at
    FROM releases
    WHERE id = $1
    `,
    [params.releaseId]
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

export async function listReleasesAdmin(params: {
  status?: ReleaseStatus;
}): Promise<ReleaseRow[]> {
  const result = await pool.query<ReleaseRow>(
    `
    SELECT id, artist_id, title, genre, status, cover_art_object_key, cover_art_public_url, created_at
    FROM releases
    WHERE ($1::text IS NULL OR status = $1)
    ORDER BY created_at DESC
    `,
    [params.status ?? null]
  );

  return result.rows;
}

export async function updateReleaseDraft(params: {
  releaseId: string;
  artistId: string;
  title: string;
  genre: string;
}): Promise<boolean> {
  const result = await pool.query(
    `
    UPDATE releases
    SET title = $1,
        genre = $2
    WHERE id = $3
      AND artist_id = $4
      AND status = 'DRAFT'
    `,
    [params.title, params.genre, params.releaseId, params.artistId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function setReleaseStatus(params: {
  releaseId: string;
  newStatus: ReleaseStatus;
  expectedCurrentStatus?: ReleaseStatus;
}): Promise<boolean> {
  const result = await pool.query(
    `
    UPDATE releases
    SET status = $1
    WHERE id = $2
      AND ($3::text IS NULL OR status = $3)
    `,
    [params.newStatus, params.releaseId, params.expectedCurrentStatus ?? null]
  );

  return (result.rowCount ?? 0) > 0;
}
