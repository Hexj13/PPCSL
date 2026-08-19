export function resolveS3BucketName(mode: 'optional' | 'required' = 'optional'): string {
  const name = process.env.AWS_S3_BUCKET_NAME?.trim() ?? '';
  if (name) {
    return name;
  }
  if (process.env.NODE_ENV === 'test') {
    return 'test-uploads';
  }
  if (mode === 'required' || process.env.NODE_ENV === 'production') {
    throw new Error('AWS_S3_BUCKET_NAME is required');
  }
  return '';
}
