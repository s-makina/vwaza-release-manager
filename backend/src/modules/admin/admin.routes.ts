import { FastifyInstance } from 'fastify';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import {
  approveRelease,
  getPendingReviewTrackAudioRef,
  listPendingReviewReleases,
  rejectRelease
} from './admin.service';
import { config } from '../../config/env';
import { createStorageClient } from '../storage/storage.service';

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/admin/releases/pending-review',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { role } = request.user;
      if (role !== 'ADMIN') {
        return reply.code(403).send({ message: 'Admin only' });
      }

      const rows = await listPendingReviewReleases();
      return reply.send(rows);
    }
  );

  app.post<{ Params: { id: string } }>(
    '/admin/releases/:id/approve',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { role } = request.user;
      if (role !== 'ADMIN') {
        return reply.code(403).send({ message: 'Admin only' });
      }

      const { id } = request.params;
      const result = await approveRelease({ releaseId: id });
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return reply.code(404).send({ message: 'Release not found' });
        }
        return reply.code(409).send({ message: 'Release is not pending review' });
      }

      return reply.send({ ok: true });
    }
  );

  app.post<{ Params: { id: string } }>(
    '/admin/releases/:id/reject',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { role } = request.user;
      if (role !== 'ADMIN') {
        return reply.code(403).send({ message: 'Admin only' });
      }

      const { id } = request.params;
      const result = await rejectRelease({ releaseId: id });
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return reply.code(404).send({ message: 'Release not found' });
        }
        return reply.code(409).send({ message: 'Release is not pending review' });
      }

      return reply.send({ ok: true });
    }
  );

  app.get<{ Params: { trackId: string } }>(
    '/admin/tracks/:trackId/audio',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { role } = request.user;
      if (role !== 'ADMIN') {
        return reply.code(403).send({ message: 'Admin only' });
      }

      const { trackId } = request.params;
      const ref = await getPendingReviewTrackAudioRef({ trackId });
      if (!ref) {
        return reply.code(404).send({ message: 'Track audio not found' });
      }

      const client = createStorageClient();
      const range = typeof request.headers.range === 'string' ? request.headers.range : undefined;

      const resp = await client.send(
        new GetObjectCommand({
          Bucket: config.s3.bucket,
          Key: ref.audio_object_key,
          Range: range
        })
      );

      const body: unknown = resp.Body;
      const stream = body as { pipe?: (dest: unknown) => unknown };
      if (!stream || typeof stream.pipe !== 'function') {
        return reply.code(500).send({ message: 'Failed to stream object' });
      }

      if (resp.ContentType) reply.header('Content-Type', resp.ContentType);
      if (resp.ContentLength !== undefined) reply.header('Content-Length', String(resp.ContentLength));
      if (resp.AcceptRanges) reply.header('Accept-Ranges', resp.AcceptRanges);
      if (resp.ContentRange) reply.header('Content-Range', resp.ContentRange);

      if (range && resp.ContentRange) {
        reply.code(206);
      }

      return reply.send(body as never);
    }
  );
}
