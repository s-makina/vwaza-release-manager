import bcrypt from 'bcrypt';
import { pool } from '../../db/pool';

export async function registerUser(
    email: string,
    password: string,
    role: 'ARTIST' | 'ADMIN'
) {
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
        `
    INSERT INTO users (email, password_hash, role)
    VALUES ($1, $2, $3)
    RETURNING id, email, role
    `,
        [email, hash, role]
    );

    return result.rows[0];
}

export async function authenticateUser(email: string, password: string) {
    const result = await pool.query(
        `SELECT id, password_hash, role FROM users WHERE email = $1`,
        [email]
    );

    const user = result.rows[0];
    if (!user) return null;

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return null;

    return { id: user.id, role: user.role };
}
