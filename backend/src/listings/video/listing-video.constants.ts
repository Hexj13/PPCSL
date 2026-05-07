export const LISTING_VIDEO_ALLOWED_MIME = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
]);

export const MAX_LISTING_VIDEO_BYTES = 314572800;
export const MAX_LISTING_VIDEO_IMPORT_BYTES = 524288000;
export const MAX_LISTING_VIDEO_DURATION_SEC = 180;

export function sanitizeVideoExtension(fileName: string): string {
  const base = fileName.split('/').pop()?.split('?')[0] || 'video.mp4';
  const last = base.includes('.') ? base.split('.').pop()?.toLowerCase() : 'mp4';
  if (last && ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(last)) {
    return `.${last}`;
  }
  return '.mp4';
}

export function videoPartCount(fileSize: number, partSize: number): number {
  return Math.max(1, Math.ceil(fileSize / partSize));
}
