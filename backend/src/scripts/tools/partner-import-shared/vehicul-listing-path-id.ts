export function extractVehiculListingPathId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const segments = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    const idx = segments.findIndex((s) => s.toLowerCase() === 'vehicul');
    if (idx < 0 || idx >= segments.length - 1) return null;
    let slug = segments[idx + 1] ?? '';
    try {
      slug = decodeURIComponent(slug);
    } catch {
      /* keep raw */
    }
    slug = slug.trim();
    if (!slug) return null;
    return slug.toLowerCase();
  } catch {
    const m = trimmed.match(/\/vehicul\/([^/?#]+)/i);
    if (!m?.[1]) return null;
    let slug = m[1].replace(/\/+$/, '').trim();
    try {
      slug = decodeURIComponent(slug);
    } catch {
      /* keep raw */
    }
    if (!slug) return null;
    return slug.toLowerCase();
  }
}
