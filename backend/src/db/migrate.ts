import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from './pool';

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    const sqlPath = path.resolve(__dirname, 'migrations.sql');
    const sql = await readFile(sqlPath, { encoding: 'utf8' });

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
  } catch (error: unknown) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    client.release();
  }
}
