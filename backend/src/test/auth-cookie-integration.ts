export function cookieHeaderFromAuthResponse(res: {
  headers: Record<string, string | string[] | undefined>;
}): string {
  const raw = res.headers['set-cookie'];
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Expected Set-Cookie headers from auth response');
  }
  return raw
    .map((line) => line.split(';')[0])
    .filter(Boolean)
    .join('; ');
}

export function refreshTokenValueFromSetCookie(res: {
  headers: Record<string, string | string[] | undefined>;
}): string {
  const raw = res.headers['set-cookie'];
  if (!Array.isArray(raw)) return '';
  for (const line of raw) {
    const [pair] = line.split(';');
    if (pair.startsWith('kupito_refresh_token=')) {
      return pair.slice('kupito_refresh_token='.length);
    }
  }
  return '';
}
