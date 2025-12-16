import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost, PresignedPost } from '@aws-sdk/s3-presigned-post';
import { config } from '../../config/env';

export type PresignUploadResult = {
  url: string;
  fields: Record<string, string>;
  objectKey: string;
  publicUrl: string | null;
};

function ensureStorageConfigured(): void {
  if (!config.s3.bucket) {
    throw new Error('S3_BUCKET is not configured');
  }
  if (!config.s3.accessKeyId || !config.s3.secretAccessKey) {
    throw new Error('S3 credentials are not configured');
  }
}

function buildPublicUrl(objectKey: string): string | null {
  const base = config.s3.publicBaseUrl.trim();
  if (!base) return null;

  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalizedBase}/${objectKey}`;
}

export function createStorageClient(): S3Client {
  ensureStorageConfigured();

  return new S3Client({
    region: config.s3.region,
    endpoint: config.s3.endpoint || undefined,
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey
    },
    forcePathStyle: Boolean(config.s3.endpoint)
  });
}

export function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) return 'file';

  return trimmed
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 120);
}

export async function presignUpload(params: {
  objectKey: string;
  contentType: string;
  maxSizeBytes: number;
  expiresInSeconds: number;
}): Promise<PresignUploadResult> {
  ensureStorageConfigured();

  const client = createStorageClient();

  const presigned: PresignedPost = await createPresignedPost(client, {
    Bucket: config.s3.bucket,
    Key: params.objectKey,
    Expires: params.expiresInSeconds,
    Fields: {
      'Content-Type': params.contentType
    },
    Conditions: [
      ['content-length-range', 1, params.maxSizeBytes],
      ['eq', '$Content-Type', params.contentType]
    ]
  });

  return {
    url: presigned.url,
    fields: presigned.fields,
    objectKey: params.objectKey,
    publicUrl: buildPublicUrl(params.objectKey)
  };
}
