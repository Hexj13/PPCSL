export function isProbablyVideoUrl(url: string): boolean {
  const lower = url.toLowerCase().trim();
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    return false;
  }
  return (
    lower.includes('.mp4') ||
    lower.includes('.webm') ||
    lower.includes('.mov') ||
    lower.includes('.avi') ||
    lower.includes('.mkv')
  );
}
