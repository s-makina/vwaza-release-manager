import { FastifyInstance } from 'fastify';
import {
  createRelease,
  listReleasesForArtist,
  updateReleaseDraft,
  getReleaseForArtistById,
  submitReleaseAndStartProcessing
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

  app.get(
    '/releases',
    {
      preHandler: app.authenticate
    },
    async (request, reply) => {
      const { userId, role } = request.user;

      if (role !== 'ARTIST') {
        return reply.code(403).send({ message: 'Artist only' });
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

      if (role !== 'ARTIST') {
        return reply.code(403).send({ message: 'Artist only' });
      }

      const release = await getReleaseForArtistById({ releaseId: id, artistId: userId });
      if (!release) {
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

      const result = await updateReleaseDraft({ releaseId: id, artistId: userId, title, genre });
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return reply.code(404).send({ message: 'Release not found' });
        }
        return reply.code(409).send({ message: 'Release is not editable' });
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

      if (role !== 'ARTIST') {
        return reply.code(403).send({ message: 'Artist only' });
      }

      const result = await submitReleaseAndStartProcessing({ releaseId: id, artistId: userId });
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return reply.code(404).send({ message: 'Release not found' });
        }
        return reply.code(409).send({ message: 'Release is not submittable' });
      }

      return reply.send({ ok: true, state: result.state });
    }
  );
}
