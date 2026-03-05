export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { fetchSitemapUpstream } from '../sitemap-upstream';

const UPSTREAM_UNAVAILABLE = 'Upstream sitemap unavailable';

export async function GET() {
  const response = await fetchSitemapUpstream('/api/sitemap.xml', 'application/xml');

  if (!response || !response.ok) {
    return new Response(UPSTREAM_UNAVAILABLE, {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const xml = await response.text();

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
