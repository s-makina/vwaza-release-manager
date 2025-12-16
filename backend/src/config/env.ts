import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(__dirname, '../../.env');

try {
  const raw = fs.readFileSync(envPath);
  let content: string;

  if (raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xfe) {
    content = raw.slice(2).toString('utf16le');
  } else if (raw.length >= 2 && raw[0] === 0xfe && raw[1] === 0xff) {
    content = raw.slice(2).swap16().toString('utf16le');
  } else if (raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) {
    content = raw.slice(3).toString('utf8');
  } else {
    content = raw.toString('utf8');
  }

  const parsed = dotenv.parse(content);
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
} catch {
  dotenv.config({ path: envPath });
}

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  nodeEnv: process.env.NODE_ENV || 'development',
  s3: {
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || '',
    bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || ''
  }
};