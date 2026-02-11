export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  if (!name.endsWith('.xml')) {
    return new Response('', { status: 404 });
  }

  try {
    const response = await fetch(`${API_URL}/api/sitemaps/${name}`, {
      cache: 'no-store',
      headers: { Accept: 'application/xml' },
    });

    if (!response.ok) {
      return new Response('', { status: response.status });
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
