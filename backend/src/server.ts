import app from './app';
import { pool } from './db/pool';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

async function start() {
  try {
    // Test database connection
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();

    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server listening on port ${PORT}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();