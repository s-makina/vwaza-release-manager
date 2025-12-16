import { FastifyInstance } from 'fastify';
import { pool } from '../../db/pool';
import { createTrack, listTracksForRelease, updateTrackTitle } from './tracks.service';

const createTrackSchema = {
  body: {
    type: 'object',
    required: ['title', 'isrc'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200 },
      isrc: { type: 'string', minLength: 12, maxLength: 12 }
    }
  }
};

const updateTrackSchema = {
  body: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200 }
    }
  }
};

async function assertReleaseAccess(params: {
  releaseId: string;
  requesterUserId: string;
  requesterRole: 'ARTIST' | 'ADMIN';
}): Promise<void> {
  const result = await pool.query<{ artist_id: string }>(
    'SELECT artist_id FROM releases WHERE id = $1',
    [params.releaseId]
  );

  const row = result.rows[0];
  if (!row) {
    throw Object.assign(new Error('Release not found'), { statusCode: 404 });
  }

  if (params.requesterRole !== 'ADMIN' && row.artist_id !== params.requesterUserId) {
    throw Object.assign(new Error('Release not found'), { statusCode: 404 });
  }
}

export async function tracksRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { releaseId: string }; Body: { title: string; isrc: string } }>(
    '/releases/:releaseId/tracks',
    {
      preHandler: app.authenticate,
      schema: createTrackSchema
    },
    async (request, reply) => {
      const { releaseId } = request.params;
      const { title, isrc } = request.body;
      const { userId, role } = request.user;

      if (role !== 'ARTIST') {
        return reply.code(403).send({ message: 'Only ARTIST can create tracks' });
      }

      try {
        await assertReleaseAccess({ releaseId, requesterUserId: userId, requesterRole: role });
        const track = await createTrack({ releaseId, title, isrc });
        return reply.send(track);
      } catch (error: unknown) {
        const maybePg = error as { code?: string; statusCode?: number; message?: string };
        if (maybePg.code === '23505') {
          return reply.code(409).send({ message: 'ISRC already exists' });
        }
        if (maybePg.code === '23514') {
          return reply.code(400).send({ message: 'Invalid track data' });
        }
        const status = maybePg.statusCode ?? 500;
        return reply.code(status).send({ message: maybePg.message ?? 'Internal server error' });
      }
    }
  );

  app.get<{ Params: { releaseId: string } }>(
    '/releases/:releaseId/tracks',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { releaseId } = request.params;
      const { userId, role } = request.user;

      try {
        await assertReleaseAccess({ releaseId, requesterUserId: userId, requesterRole: role });
        const tracks = await listTracksForRelease({ releaseId });
        return reply.send(tracks);
      } catch (error: unknown) {
        const maybe = error as { statusCode?: number; message?: string };
        const status = maybe.statusCode ?? 500;
        return reply.code(status).send({ message: maybe.message ?? 'Internal server error' });
      }
    }
  );

  app.patch<{ Params: { releaseId: string; trackId: string }; Body: { title: string } }>(
    '/releases/:releaseId/tracks/:trackId',
    {
      preHandler: app.authenticate,
      schema: updateTrackSchema
    },
    async (request, reply) => {
      const { releaseId, trackId } = request.params;
      const { title } = request.body;
      const { userId, role } = request.user;

      if (role !== 'ARTIST') {
        return reply.code(403).send({ message: 'Only ARTIST can edit tracks' });
      }

      try {
        await assertReleaseAccess({ releaseId, requesterUserId: userId, requesterRole: role });
        const ok = await updateTrackTitle({ trackId, releaseId, title });
        if (!ok) {
          return reply.code(404).send({ message: 'Track not found' });
        }
        return reply.send({ ok: true });
      } catch (error: unknown) {
        const maybe = error as { statusCode?: number; message?: string };
        const status = maybe.statusCode ?? 500;
        return reply.code(status).send({ message: maybe.message ?? 'Internal server error' });
      }
    }
  );
}
