import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

const output = {
    error: result.error ? result.error.message : null,
    parsed: result.parsed,
    DATABASE_URL_TYPE: typeof process.env.DATABASE_URL,
    DATABASE_URL_VAL: process.env.DATABASE_URL ? (process.env.DATABASE_URL.substring(0, 15) + '...') : 'undefined',
    NODE_ENV: process.env.NODE_ENV
};

console.log('Env check output:', output);
