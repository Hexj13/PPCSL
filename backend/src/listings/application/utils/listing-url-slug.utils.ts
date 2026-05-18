import { createSlug } from '../../../common/utils/slug.utils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_STORED_SLUG_LEN = 120;

export function truncateListingSlugPart(slug: string): string {
  const s = slug.trim();
  if (s.length <= MAX_STORED_SLUG_LEN) {
    return s;
  }
  return s.slice(0, MAX_STORED_SLUG_LEN).replace(/-+$/g, '') || 'listing';
}

export function buildListingSlugPart(title: string, city: string): string {
  const raw = `${title ?? ''} ${city ?? ''}`.trim();
  const slug = createSlug(raw || 'listing');
  return truncateListingSlugPart(slug || 'listing');
}

export function extractListingIdFromRouteParam(param: string): string | null {
  const trimmed = param.trim();
  if (!trimmed) {
    return null;
  }
  if (UUID_REGEX.test(trimmed)) {
    return trimmed;
  }
  const m = trimmed.match(/^(.+)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if (!m || !m[1] || !m[2]) {
    return null;
  }
  return m[2];
}

export function listingPublicPathSegment(slug: string | null | undefined, id: string): string {
  const part = slug?.trim();
  if (!part) {
    return id;
  }
  return `${part}-${id}`;
}
