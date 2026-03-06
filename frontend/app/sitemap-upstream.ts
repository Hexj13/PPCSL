const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const RETRY_DELAY_MS = 400;
const MAX_ATTEMPTS = 3;

export async function fetchSitemapUpstream(path: string, accept: string): Promise<Response | null> {
  const url = `${API_URL}${path}`;
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: accept },
      });
      lastResponse = res;
      if (res.ok) return res;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    } catch (e) {
      lastError = e;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  if (lastResponse) {
    console.error('[sitemap] upstream error', {
      path,
      status: lastResponse.status,
      statusText: lastResponse.statusText,
    });
    return lastResponse;
  }
  console.error('[sitemap] upstream fetch failed', { path, error: lastError });
  return null;
}
