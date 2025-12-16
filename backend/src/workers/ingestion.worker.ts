import { pool } from '../db/pool';

export type IngestionWorkerOptions = {
  intervalMs: number;
};

export type IngestionWorkerHandle = {
  stop: () => void;
};

function parseCount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function promoteReadyReleasesOnce(): Promise<void> {
  const processing = await pool.query<{ id: string }>(
    `
    SELECT id
    FROM releases
    WHERE status = 'PROCESSING'
    ORDER BY created_at ASC
    LIMIT 50
    `
  );

  for (const row of processing.rows) {
    const stats = await pool.query<{ total: string; with_audio: string }>(
      `
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE audio_object_key IS NOT NULL)::text AS with_audio
      FROM tracks
      WHERE release_id = $1
      `,
      [row.id]
    );

    const total = parseCount(stats.rows[0]?.total);
    const withAudio = parseCount(stats.rows[0]?.with_audio);

    if (total === 0) continue;
    if (total !== withAudio) continue;

    await pool.query(
      `
      UPDATE releases
      SET status = 'PENDING_REVIEW'
      WHERE id = $1
        AND status = 'PROCESSING'
      `,
      [row.id]
    );
  }
}

export function startIngestionWorker(options: IngestionWorkerOptions): IngestionWorkerHandle {
  const interval = setInterval(() => {
    void promoteReadyReleasesOnce().catch(() => {
      // rely on Fastify/global logging; avoid crashing the process for MVP worker errors
    });
  }, options.intervalMs);

  return {
    stop: () => clearInterval(interval)
  };
}
