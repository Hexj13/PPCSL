import * as path from 'path';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function uploadRobotsTxt() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'eu-north-1';
  const bucketName = process.env.AWS_S3_BUCKET_NAME || 'kupito-uploads';

  if (!accessKeyId || !secretAccessKey || !bucketName) {
    console.error('❌ Missing AWS credentials or bucket name');
    console.error('Required environment variables:');
    console.error('  - AWS_ACCESS_KEY_ID');
    console.error('  - AWS_SECRET_ACCESS_KEY');
    console.error('  - AWS_S3_BUCKET_NAME');
    process.exit(1);
  }

  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const robotsTxtContent = `User-agent: *
Allow: /
`;

  try {
    console.log(`📤 Uploading robots.txt to S3 bucket: ${bucketName}...`);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: 'robots.txt',
      Body: robotsTxtContent,
      ContentType: 'text/plain',
      CacheControl: 'public, max-age=3600',
    });

    await s3Client.send(command);

    console.log('✅ robots.txt uploaded successfully!');
    console.log(`📍 URL: https://${bucketName}.s3.${region}.amazonaws.com/robots.txt`);

    if (process.env.AWS_CLOUDFRONT_URL) {
      console.log(`📍 CDN URL: ${process.env.AWS_CLOUDFRONT_URL}/robots.txt`);
      console.log(
        '\n⚠️  Note: If CloudFront caching is enabled, you may need to invalidate the cache:',
      );
      console.log('   1. Go to AWS Console → CloudFront → Your distribution');
      console.log('   2. Create invalidation for: /robots.txt');
    }

    console.log('\n✅ Done! Google Search Console should be able to access robots.txt now.');
  } catch (error) {
    console.error('❌ Error uploading robots.txt:', error);
    process.exit(1);
  }
}

uploadRobotsTxt();
