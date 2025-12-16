import { CloudStorageProvider } from './cloudStorage';
import { S3CloudStorageProvider } from './s3StorageProvider';

export function createCloudStorageProvider(): CloudStorageProvider {
  return new S3CloudStorageProvider();
}
