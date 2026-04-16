import { registerAs } from '@nestjs/config';

export const uploadConfig = registerAs('upload', () => ({
  awsRegion: process.env.AWS_REGION || '',
  awsS3BucketName: process.env.AWS_S3_BUCKET_NAME || '',
  awsCloudFrontUrl: process.env.AWS_CLOUDFRONT_URL || '',
  maxFileSize: 10 * 1024 * 1024,
}));

export type UploadConfig = ReturnType<typeof uploadConfig>;
