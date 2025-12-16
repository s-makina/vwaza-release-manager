import { FastifyInstance } from 'fastify';
import { pool } from '../../db/pool';
import { presignUpload, sanitizeFilename } from './storage.service';
import { createCloudStorageProvider } from '../../cloud/createCloudProvider';

const presignCoverArtSchema = {
  body: {
    type: 'object',
    required: ['releaseId', 'contentType', 'fileName'],
    properties: {
      releaseId: { type: 'string', minLength: 1 },
      contentType: { type: 'string', minLength: 1 },
      fileName: { type: 'string', minLength: 1 }
    }
  }
};

const presignTrackAudioSchema = {
  body: {
    type: 'object',
    required: ['releaseId', 'contentType', 'fileName'],
    properties: {
      releaseId: { type: 'string', minLength: 1 },
      trackId: { type: 'string', minLength: 1 },
      contentType: { type: 'string', minLength: 1 },
      fileName: { type: 'string', minLength: 1 }
    }
  }
};

const finalizeCoverArtSchema = {
  body: {
    type: 'object',
    required: ['releaseId', 'objectKey'],
    properties: {
      releaseId: { type: 'string', minLength: 1 },
      objectKey: { type: 'string', minLength: 1 },
      publicUrl: { type: 'string', minLength: 1 }
    }
  }
};

const finalizeTrackAudioSchema = {
  body: {
    type: 'object',
    required: ['releaseId', 'trackId', 'objectKey'],
    properties: {
      releaseId: { type: 'string', minLength: 1 },
      trackId: { type: 'string', minLength: 1 },
      objectKey: { type: 'string', minLength: 1 },
      publicUrl: { type: 'string', minLength: 1 }
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

  if (params.requesterRole === 'ADMIN') return;

  if (row.artist_id !== params.requesterUserId) {
    throw Object.assign(new Error('Release not found'), { statusCode: 404 });
  }
}

export async function storageRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { releaseId: string; contentType: string; fileName: string } }>(
    '/storage/presign/cover-art',
    {
      preHandler: app.authenticate,
      schema: presignCoverArtSchema
    },
    async (request, reply) => {
      const { releaseId, contentType, fileName } = request.body;
      const { userId, role } = request.user;

      try {
        await assertReleaseAccess({
          releaseId,
          requesterUserId: userId,
          requesterRole: role
        });

        const safeName = sanitizeFilename(fileName);
        const objectKey = `releases/${releaseId}/cover/${Date.now()}-${safeName}`;

        const presign = await presignUpload({
          objectKey,
          contentType,
          maxSizeBytes: 10 * 1024 * 1024,
          expiresInSeconds: 60
        });

        return reply.send(presign);
      } catch (error: unknown) {
        const maybe = error as { statusCode?: number; message?: string };
        const code = maybe.statusCode ?? 500;
        return reply.code(code).send({ message: maybe.message ?? 'Internal server error' });
      }
    }
  );

  app.post<{
    Body: { releaseId: string; trackId?: string; contentType: string; fileName: string };
  }>(
    '/storage/presign/track-audio',
    {
      preHandler: app.authenticate,
      schema: presignTrackAudioSchema
    },
    async (request, reply) => {
      const { releaseId, trackId, contentType, fileName } = request.body;
      const { userId, role } = request.user;

      try {
        await assertReleaseAccess({
          releaseId,
          requesterUserId: userId,
          requesterRole: role
        });

        const safeName = sanitizeFilename(fileName);
        const trackPart = trackId ? `tracks/${trackId}` : `tracks/unassigned`;
        const objectKey = `releases/${releaseId}/${trackPart}/audio/${Date.now()}-${safeName}`;

        const presign = await presignUpload({
          objectKey,
          contentType,
          maxSizeBytes: 50 * 1024 * 1024,
          expiresInSeconds: 60
        });

        return reply.send(presign);
      } catch (error: unknown) {
        const maybe = error as { statusCode?: number; message?: string };
        const code = maybe.statusCode ?? 500;
        return reply.code(code).send({ message: maybe.message ?? 'Internal server error' });
      }
    }
  );

  app.post<{ Body: { releaseId: string; objectKey: string; publicUrl?: string } }>(
    '/storage/finalize/cover-art',
    {
      preHandler: app.authenticate,
      schema: finalizeCoverArtSchema
    },
    async (request, reply) => {
      const { releaseId, objectKey, publicUrl } = request.body;
      const { userId, role } = request.user;

      try {
        await assertReleaseAccess({
          releaseId,
          requesterUserId: userId,
          requesterRole: role
        });

        const expectedPrefix = `releases/${releaseId}/`;
        if (!objectKey.startsWith(expectedPrefix)) {
          return reply.code(400).send({ message: 'objectKey is not scoped to releaseId' });
        }

        const result = await pool.query(
          `
          UPDATE releases
          SET cover_art_object_key = $1,
              cover_art_public_url = $2,
              cover_art_url = $2
          WHERE id = $3
            AND status = 'DRAFT'
          `,
          [objectKey, publicUrl ?? null, releaseId]
        );

        if (result.rowCount === 0) {
          return reply.code(409).send({ message: 'Release is not editable or does not exist' });
        }

        return reply.send({ ok: true });
      } catch (error: unknown) {
        const maybe = error as { statusCode?: number; message?: string };
        const code = maybe.statusCode ?? 500;
        return reply.code(code).send({ message: maybe.message ?? 'Internal server error' });
      }
    }
  );

  app.post<{
    Body: { releaseId: string; trackId: string; objectKey: string; publicUrl?: string };
  }>(
    '/storage/finalize/track-audio',
    {
      preHandler: app.authenticate,
      schema: finalizeTrackAudioSchema
    },
    async (request, reply) => {
      const { releaseId, trackId, objectKey, publicUrl } = request.body;
      const { userId, role } = request.user;

      try {
        await assertReleaseAccess({
          releaseId,
          requesterUserId: userId,
          requesterRole: role
        });

        const expectedPrefix = `releases/${releaseId}/`;
        if (!objectKey.startsWith(expectedPrefix)) {
          return reply.code(400).send({ message: 'objectKey is not scoped to releaseId' });
        }

        const result = await pool.query(
          `
          UPDATE tracks t
          SET audio_object_key = $1,
              audio_public_url = $2,
              audio_url = $2
          FROM releases r
          WHERE t.id = $3
            AND t.release_id = r.id
            AND r.id = $4
            AND r.status = 'DRAFT'
          `,
          [objectKey, publicUrl ?? null, trackId, releaseId]
        );

        if (result.rowCount === 0) {
          return reply.code(409).send({ message: 'Track/release not editable or does not exist' });
        }

        return reply.send({ ok: true });
      } catch (error: unknown) {
        const maybe = error as { statusCode?: number; message?: string };
        const code = maybe.statusCode ?? 500;
        return reply.code(code).send({ message: maybe.message ?? 'Internal server error' });
      }
    }
  );

  app.post<{
    Params: { releaseId: string };
  }>(
    '/storage/upload/cover-art/:releaseId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { releaseId } = request.params;
      const { userId, role } = request.user;

      try {
        await assertReleaseAccess({
          releaseId,
          requesterUserId: userId,
          requesterRole: role
        });

        const statusCheck = await pool.query<{ status: string }>(
          'SELECT status FROM releases WHERE id = $1',
          [releaseId]
        );

        if ((statusCheck.rows[0]?.status ?? '') !== 'DRAFT') {
          return reply.code(409).send({ message: 'Release is not editable' });
        }

        const part = await request.file();
        if (!part) {
          return reply.code(400).send({ message: 'Missing file' });
        }

        const safeName = sanitizeFilename(part.filename);
        const objectKey = `releases/${releaseId}/cover/${Date.now()}-${safeName}`;

        const provider = createCloudStorageProvider();
        const uploadResult = await provider.uploadStream({
          objectKey,
          contentType: part.mimetype,
          body: part.file
        });

        try {
          const db = await pool.query(
            `
            UPDATE releases
            SET cover_art_object_key = $1,
                cover_art_public_url = $2,
                cover_art_url = $2
            WHERE id = $3
              AND status = 'DRAFT'
            `,
            [uploadResult.objectKey, uploadResult.publicUrl, releaseId]
          );

          if (db.rowCount === 0) {
            await provider.deleteObject({ objectKey: uploadResult.objectKey });
            return reply.code(409).send({ message: 'Release is not editable or does not exist' });
          }

          return reply.send({
            objectKey: uploadResult.objectKey,
            publicUrl: uploadResult.publicUrl
          });
        } catch (e: unknown) {
          await provider.deleteObject({ objectKey: uploadResult.objectKey });
          throw e;
        }
      } catch (error: unknown) {
        const maybe = error as { statusCode?: number; message?: string };
        const code = maybe.statusCode ?? 500;
        return reply.code(code).send({ message: maybe.message ?? 'Internal server error' });
      }
    }
  );

  app.post<{
    Params: { releaseId: string; trackId: string };
  }>(
    '/storage/upload/track-audio/:releaseId/:trackId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { releaseId, trackId } = request.params;
      const { userId, role } = request.user;

      try {
        await assertReleaseAccess({
          releaseId,
          requesterUserId: userId,
          requesterRole: role
        });

        const part = await request.file();
        if (!part) {
          return reply.code(400).send({ message: 'Missing file' });
        }

        const safeName = sanitizeFilename(part.filename);
        const objectKey = `releases/${releaseId}/tracks/${trackId}/audio/${Date.now()}-${safeName}`;

        const provider = createCloudStorageProvider();
        const uploadResult = await provider.uploadStream({
          objectKey,
          contentType: part.mimetype,
          body: part.file
        });

        try {
          const db = await pool.query(
            `
            UPDATE tracks t
            SET audio_object_key = $1,
                audio_public_url = $2,
                audio_url = $2
            FROM releases r
            WHERE t.id = $3
              AND t.release_id = r.id
              AND r.id = $4
              AND r.status = 'DRAFT'
            `,
            [uploadResult.objectKey, uploadResult.publicUrl, trackId, releaseId]
          );

          if (db.rowCount === 0) {
            await provider.deleteObject({ objectKey: uploadResult.objectKey });
            return reply.code(409).send({ message: 'Track/release not editable or does not exist' });
          }

          return reply.send({
            objectKey: uploadResult.objectKey,
            publicUrl: uploadResult.publicUrl
          });
        } catch (e: unknown) {
          await provider.deleteObject({ objectKey: uploadResult.objectKey });
          throw e;
        }
      } catch (error: unknown) {
        const maybe = error as { statusCode?: number; message?: string };
        const code = maybe.statusCode ?? 500;
        return reply.code(code).send({ message: maybe.message ?? 'Internal server error' });
      }
    }
  );
}
