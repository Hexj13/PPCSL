export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugMatches(urlSlug: string, name: string): boolean {
  const normalizedUrl = createSlug(urlSlug.trim()).replace(/-/g, '');
  const normalizedName = createSlug(name).replace(/-/g, '');
  return normalizedUrl === normalizedName;
}

export function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
