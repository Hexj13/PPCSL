import { registerAs } from '@nestjs/config';

function resolveUploadDeleteTokenSecret(): string {
  const dedicated = process.env.UPLOAD_DELETE_TOKEN_SECRET?.trim();
  if (dedicated) {
    return dedicated;
  }
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (jwtSecret) {
    return jwtSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('UPLOAD_DELETE_TOKEN_SECRET or JWT_SECRET is required in production');
  }
  return 'dev-upload-delete-secret';
}

export const uploadConfig = registerAs('upload', () => ({
  awsRegion: process.env.AWS_REGION || '',
  awsS3BucketName: process.env.AWS_S3_BUCKET_NAME || '',
  awsCloudFrontUrl: process.env.AWS_CLOUDFRONT_URL || '',
  maxFileSize: 10 * 1024 * 1024,
  deleteTokenSecret: resolveUploadDeleteTokenSecret(),
}));

export type UploadConfig = ReturnType<typeof uploadConfig>;
