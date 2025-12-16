import { Readable } from 'node:stream';

export type CloudUploadResult = {
  provider: string;
  objectKey: string;
  publicUrl: string | null;
};

export type CloudUploadParams = {
  objectKey: string;
  contentType: string;
  body: Readable;
  contentLength?: number;
};

export interface CloudStorageProvider {
  readonly name: string;

  uploadStream(params: CloudUploadParams): Promise<CloudUploadResult>;

  deleteObject(params: { objectKey: string }): Promise<void>;
}
