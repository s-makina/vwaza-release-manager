import app from './app';
import { pool } from './db/pool';

const PORT = 3001;

async function start() {
    try {
        const client = await pool.connect();
        console.log('Database connected successfully');
        client.release();

        await app.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Test Server listening on port ${PORT}`);
    } catch (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
}

start();
