export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/sitemap.xml`, {
      cache: 'no-store',
      headers: { Accept: 'application/xml' },
    });

    if (!response.ok) {
      return new Response('', { status: 502 });
    }

    const xml = await response.text();

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch {
    return new Response('', { status: 502 });
  }
}
