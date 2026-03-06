export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { fetchSitemapUpstream } from '../sitemap-upstream';

const UPSTREAM_UNAVAILABLE = 'Upstream sitemap unavailable';

export async function GET() {
  const response = await fetchSitemapUpstream('/api/sitemap.txt', 'text/plain');

  if (!response || !response.ok) {
    return new Response(UPSTREAM_UNAVAILABLE, {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const txt = await response.text();

  return new Response(txt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
