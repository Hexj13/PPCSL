export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { fetchSitemapUpstream } from '../../sitemap-upstream';

const UPSTREAM_UNAVAILABLE = 'Upstream sitemap unavailable';

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  if (!name.endsWith('.xml')) {
    return new Response('', { status: 404 });
  }

  const response = await fetchSitemapUpstream(`/api/sitemaps/${name}`, 'application/xml');

  if (!response) {
    return new Response(UPSTREAM_UNAVAILABLE, {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (!response.ok) {
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
