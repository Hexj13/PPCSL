/**
 * Unit tests share Moldova fixtures (phones, cities, parser catalog).
 * Platform overlays (e.g. COUNTRY=al) must not change default Jest country.
 */
if (!process.env.JEST_PRESERVE_COUNTRY) {
  process.env.COUNTRY = 'md';
  process.env.NEXT_PUBLIC_COUNTRY = 'md';
}
