import app from './app';
import { pool } from './db/pool';
import { runMigrations } from './db/migrate';
import { config } from './config/env';
import { startIngestionWorker } from './workers/ingestion.worker';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

async function start() {
  try {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET is required');
    }
    if (config.nodeEnv === 'production') {
      if (!config.s3.bucket) throw new Error('S3_BUCKET is required in production');
      if (!config.s3.accessKeyId) throw new Error('S3_ACCESS_KEY_ID is required in production');
      if (!config.s3.secretAccessKey) throw new Error('S3_SECRET_ACCESS_KEY is required in production');
    }

    await runMigrations();

    // Test database connection
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();

    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server listening on port ${PORT}`);

    startIngestionWorker({ intervalMs: 5000 });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();