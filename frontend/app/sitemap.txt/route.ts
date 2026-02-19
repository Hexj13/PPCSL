export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/sitemap.txt`, {
      cache: 'no-store',
      headers: { Accept: 'text/plain' },
    });

    if (!response.ok) {
      return new Response('', { status: 502 });
    }

    const txt = await response.text();

    return new Response(txt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch {
    return new Response('', { status: 502 });
  }
}
