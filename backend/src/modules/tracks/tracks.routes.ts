import { FastifyInstance } from 'fastify';
import {
  createTrackForArtist,
  deleteTrackForArtist,
  listTracksForArtistRelease,
  updateTrackForArtist
} from './tracks.service';

const createTrackSchema = {
  body: {
    type: 'object',
    required: ['title', 'isrc'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200 },
      isrc: { type: 'string', minLength: 12, maxLength: 12 },
      duration: { type: 'integer', minimum: 1 },
      audioUrl: { type: 'string', minLength: 1 }
    }
  }
};

const updateTrackSchema = {
  body: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200 },
      isrc: { type: 'string', minLength: 12, maxLength: 12 },
      duration: { type: 'integer', minimum: 1 },
      audioUrl: { type: 'string', minLength: 1 }
    }
  }
};

export async function tracksRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Params: { releaseId: string };
    Body: { title: string; isrc: string; duration?: number; audioUrl?: string };
  }>(
    '/releases/:releaseId/tracks',
    {
      preHandler: app.authenticate,
      schema: createTrackSchema
    },
    async (request, reply) => {
      const { releaseId } = request.params;
      const { title, isrc, duration, audioUrl } = request.body;
      const { userId, role } = request.user;

      if (role !== 'ARTIST') {
        return reply.code(403).send({ message: 'Only ARTIST can create tracks' });
      }

      try {
        const result = await createTrackForArtist({
          artistId: userId,
          releaseId,
          title,
          isrc,
          duration,
          audioUrl
        });

        if (!result.ok) {
          if (result.reason === 'release_not_found') {
            return reply.code(404).send({ message: 'Release not found' });
          }
          return reply.code(409).send({ message: 'Release is not editable' });
        }

        return reply.send(result.track);
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
        if (role !== 'ARTIST') {
          return reply.code(403).send({ message: 'Artist only' });
        }

        const result = await listTracksForArtistRelease({ artistId: userId, releaseId });
        if (!result.ok) {
          return reply.code(404).send({ message: 'Release not found' });
        }
        return reply.send(result.tracks);
      } catch (error: unknown) {
        const maybe = error as { statusCode?: number; message?: string };
        const status = maybe.statusCode ?? 500;
        return reply.code(status).send({ message: maybe.message ?? 'Internal server error' });
      }
    }
  );

  app.patch<{
    Params: { releaseId: string; trackId: string };
    Body: { title: string; isrc?: string; duration?: number; audioUrl?: string };
  }>(
    '/releases/:releaseId/tracks/:trackId',
    {
      preHandler: app.authenticate,
      schema: updateTrackSchema
    },
    async (request, reply) => {
      const { releaseId, trackId } = request.params;
      const { title, isrc, duration, audioUrl } = request.body;
      const { userId, role } = request.user;

      if (role !== 'ARTIST') {
        return reply.code(403).send({ message: 'Only ARTIST can edit tracks' });
      }

      try {
        const result = await updateTrackForArtist({
          artistId: userId,
          trackId,
          releaseId,
          title,
          isrc,
          duration,
          audioUrl
        });

        if (!result.ok) {
          if (result.reason === 'not_found') {
            return reply.code(404).send({ message: 'Track not found' });
          }
          return reply.code(409).send({ message: 'Release is not editable' });
        }
        return reply.send({ ok: true });
      } catch (error: unknown) {
        const maybe = error as { statusCode?: number; message?: string };
        const status = maybe.statusCode ?? 500;
        return reply.code(status).send({ message: maybe.message ?? 'Internal server error' });
      }
    }
  );

  app.delete<{
    Params: { releaseId: string; trackId: string };
  }>(
    '/releases/:releaseId/tracks/:trackId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { releaseId, trackId } = request.params;
      const { userId, role } = request.user;

      if (role !== 'ARTIST') {
        return reply.code(403).send({ message: 'Only ARTIST can delete tracks' });
      }

      try {
        const result = await deleteTrackForArtist({
          artistId: userId,
          trackId,
          releaseId
        });

        if (!result.ok) {
          if (result.reason === 'not_found') {
            return reply.code(404).send({ message: 'Track not found' });
          }
          return reply.code(409).send({ message: 'Release is not editable' });
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
