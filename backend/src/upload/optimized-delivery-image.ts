import sharp from 'sharp';

export async function resizeAndEncodeWebp(
  imageBuffer: Buffer,
  quality: number,
  maxWidth?: number,
  effort = 3,
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  let processedImage = image;

  if (maxWidth && metadata.width && metadata.width > maxWidth) {
    processedImage = processedImage.resize(maxWidth, null, {
      withoutEnlargement: true,
      fit: 'inside',
    });
  }

  return processedImage.webp({ quality, effort }).toBuffer();
}
