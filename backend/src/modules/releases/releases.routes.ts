import { FastifyInstance } from 'fastify';
import { pool } from '../../db/pool';
import {
  createRelease,
  getReleaseById,
  listReleasesAdmin,
  listReleasesForArtist,
  setReleaseStatus,
  updateReleaseDraft,
  ReleaseStatus
} from './releases.service';

const createReleaseSchema = {
  body: {
    type: 'object',
    required: ['title', 'genre'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200 },
      genre: { type: 'string', minLength: 1, maxLength: 80 }
    }
  }
};

const updateReleaseSchema = {
  body: {
    type: 'object',
    required: ['title', 'genre'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200 },
      genre: { type: 'string', minLength: 1, maxLength: 80 }
    }
  }
};

const listReleasesSchema = {
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string' }
    }
  }
};

function isReleaseStatus(value: string): value is ReleaseStatus {
  return (
    value === 'DRAFT' ||
    value === 'PROCESSING' ||
    value === 'PENDING_REVIEW' ||
    value === 'PUBLISHED' ||
    value === 'REJECTED'
  );
}

function parseCount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function releasesRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { title: string; genre: string } }>(
    '/releases',
    {
      preHandler: app.authenticate,
      schema: createReleaseSchema
    },
    async (request, reply) => {
      const { title, genre } = request.body;
      const { userId, role } = request.user;

      if (role !== 'ARTIST') {
        return reply.code(403).send({ message: 'Only ARTIST can create releases' });
      }

      const release = await createRelease({ artistId: userId, title, genre });
      return reply.send(release);
    }
  );

  app.get<{ Querystring: { status?: string } }>(
    '/releases',
    {
      preHandler: app.authenticate,
      schema: listReleasesSchema
    },
    async (request, reply) => {
      const { userId, role } = request.user;
      const { status } = request.query;

      if (role === 'ADMIN') {
        if (status && !isReleaseStatus(status)) {
          return reply.code(400).send({ message: 'Invalid status' });
        }
        const rows = await listReleasesAdmin({ status: status as ReleaseStatus | undefined });
        return reply.send(rows);
      }

      const rows = await listReleasesForArtist({ artistId: userId });
      return reply.send(rows);
    }
  );

  app.get<{ Params: { id: string } }>(
    '/releases/:id',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params;
      const { userId, role } = request.user;

      const release = await getReleaseById({ releaseId: id });
      if (!release) {
        return reply.code(404).send({ message: 'Release not found' });
      }

      if (role !== 'ADMIN' && release.artist_id !== userId) {
        return reply.code(404).send({ message: 'Release not found' });
      }

      return reply.send(release);
    }
  );

  app.patch<{ Params: { id: string }; Body: { title: string; genre: string } }>(
    '/releases/:id',
    {
      preHandler: app.authenticate,
      schema: updateReleaseSchema
    },
    async (request, reply) => {
      const { id } = request.params;
      const { title, genre } = request.body;
      const { userId, role } = request.user;

      if (role !== 'ARTIST') {
        return reply.code(403).send({ message: 'Only ARTIST can edit releases' });
      }

      const ok = await updateReleaseDraft({ releaseId: id, artistId: userId, title, genre });
      if (!ok) {
        return reply.code(409).send({ message: 'Release is not editable or does not exist' });
      }

      return reply.send({ ok: true });
    }
  );

  app.post<{ Params: { id: string } }>(
    '/releases/:id/submit',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params;
      const { userId, role } = request.user;

      const release = await getReleaseById({ releaseId: id });
      if (!release) {
        return reply.code(404).send({ message: 'Release not found' });
      }

      if (role !== 'ADMIN' && release.artist_id !== userId) {
        return reply.code(404).send({ message: 'Release not found' });
      }

      if (role !== 'ARTIST') {
        return reply.code(403).send({ message: 'Only ARTIST can submit releases' });
      }

      const stats = await pool.query<{ total: string; with_audio: string }>(
        `
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE audio_object_key IS NOT NULL)::text AS with_audio
        FROM tracks
        WHERE release_id = $1
        `,
        [id]
      );

      const total = parseCount(stats.rows[0]?.total);
      const withAudio = parseCount(stats.rows[0]?.with_audio);

      if (total === 0) {
        return reply.code(400).send({ message: 'Release must have at least one track before submit' });
      }
      if (total !== withAudio) {
        return reply.code(400).send({ message: 'All tracks must have uploaded audio before submit' });
      }

      const ok = await setReleaseStatus({
        releaseId: id,
        newStatus: 'PROCESSING',
        expectedCurrentStatus: 'DRAFT'
      });

      if (!ok) {
        return reply.code(409).send({ message: 'Invalid release state' });
      }

      return reply.send({ ok: true });
    }
  );

  app.post<{ Params: { id: string } }>(
    '/admin/releases/:id/publish',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params;
      const { role } = request.user;

      if (role !== 'ADMIN') {
        return reply.code(403).send({ message: 'Admin only' });
      }

      const ok = await setReleaseStatus({
        releaseId: id,
        newStatus: 'PUBLISHED',
        expectedCurrentStatus: 'PENDING_REVIEW'
      });

      if (!ok) {
        return reply.code(409).send({ message: 'Invalid release state' });
      }

      return reply.send({ ok: true });
    }
  );

  app.post<{ Params: { id: string } }>(
    '/admin/releases/:id/reject',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params;
      const { role } = request.user;

      if (role !== 'ADMIN') {
        return reply.code(403).send({ message: 'Admin only' });
      }

      const ok = await setReleaseStatus({
        releaseId: id,
        newStatus: 'REJECTED',
        expectedCurrentStatus: 'PENDING_REVIEW'
      });

      if (!ok) {
        return reply.code(409).send({ message: 'Invalid release state' });
      }

      return reply.send({ ok: true });
    }
  );
}
