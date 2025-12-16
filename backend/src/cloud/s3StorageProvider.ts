import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { config } from '../config/env';
import { createStorageClient } from '../modules/storage/storage.service';
import { CloudStorageProvider, CloudUploadParams, CloudUploadResult } from './cloudStorage';

function buildPublicUrl(objectKey: string): string {
  const base = config.s3.publicBaseUrl.trim();
  if (base) {
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${normalizedBase}/${objectKey}`;
  }

  const bucket = config.s3.bucket.trim();
  const region = config.s3.region.trim();
  const endpoint = config.s3.endpoint.trim();

  if (endpoint) {
    const normalized = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    return `${normalized}/${bucket}/${objectKey}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
}

export class S3CloudStorageProvider implements CloudStorageProvider {
  public readonly name = 's3';

  public async uploadStream(params: CloudUploadParams): Promise<CloudUploadResult> {
    const client = createStorageClient();

    const upload = new Upload({
      client,
      params: {
        Bucket: config.s3.bucket,
        Key: params.objectKey,
        Body: params.body,
        ContentType: params.contentType
      },
      leavePartsOnError: false
    });

    await upload.done();

    return {
      provider: this.name,
      objectKey: params.objectKey,
      publicUrl: buildPublicUrl(params.objectKey)
    };
  }

  public async deleteObject(params: { objectKey: string }): Promise<void> {
    const client = createStorageClient();
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.s3.bucket,
        Key: params.objectKey
      })
    );
  }
}
