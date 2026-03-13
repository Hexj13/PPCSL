export function getVersionedAssetPath(path: string, version?: string): string {
  if (!version) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${encodeURIComponent(version)}`;
}
