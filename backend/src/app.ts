/// <reference path="./types/fastify-jwt.d.ts" />
import fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { authRoutes } from './modules/auth/auth.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { releasesRoutes } from './modules/releases/releases.routes';
import { storageRoutes } from './modules/storage/storage.routes';
import { tracksRoutes } from './modules/tracks/tracks.routes';
import { jwtPlugin } from './plugins/jwt';

const app = fastify({ logger: true });

app.setErrorHandler(async (error, request, reply) => {
  request.log.error({ err: error }, 'request error');

  const statusCode =
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;

  const message = error instanceof Error ? error.message : 'Internal server error';

  if (statusCode >= 400 && statusCode < 500) {
    await reply.code(statusCode).send({ message });
    return;
  }

  await reply.code(500).send({ message: 'Internal server error' });
});

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

app.register(multipart, {
  limits: {
    fileSize: 60 * 1024 * 1024
  }
});

app.register(jwtPlugin);
app.register(authRoutes);
app.register(adminRoutes);
app.register(releasesRoutes);
app.register(tracksRoutes);
app.register(storageRoutes);

export default app;