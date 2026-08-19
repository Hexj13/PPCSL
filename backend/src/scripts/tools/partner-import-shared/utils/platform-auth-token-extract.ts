const KUPITO_ACCESS_TOKEN_COOKIE_NAME = 'kupito_access_token';
const KUPITO_REFRESH_TOKEN_COOKIE_NAME = 'kupito_refresh_token';

function firstCookieValue(cookieLine: string, cookieName: string): string | undefined {
  const prefix = `${cookieName}=`;
  if (!cookieLine.startsWith(prefix)) {
    return undefined;
  }
  const rest = cookieLine.slice(prefix.length);
  const semi = rest.indexOf(';');
  return (semi === -1 ? rest : rest.slice(0, semi)).trim();
}

export function readKupitoAuthTokensFromSetCookieHeaders(response: Response): {
  accessToken?: string;
  refreshToken?: string;
} {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  const lines = typeof getSetCookie === 'function' ? getSetCookie() : [];
  let accessToken: string | undefined;
  let refreshToken: string | undefined;
  for (const line of lines) {
    if (!accessToken) {
      const v = firstCookieValue(line, KUPITO_ACCESS_TOKEN_COOKIE_NAME);
      if (v) {
        accessToken = v;
      }
    }
    if (!refreshToken) {
      const v = firstCookieValue(line, KUPITO_REFRESH_TOKEN_COOKIE_NAME);
      if (v) {
        refreshToken = v;
      }
    }
  }
  return { accessToken, refreshToken };
}

export function mergeKupitoAuthTokensFromBodyAndCookies(
  body: { access_token?: string; refresh_token?: string },
  response: Response,
): { access_token: string; refresh_token: string } {
  const fromCookies = readKupitoAuthTokensFromSetCookieHeaders(response);
  const access_token =
    (typeof body.access_token === 'string' && body.access_token) || fromCookies.accessToken || '';
  const refresh_token =
    (typeof body.refresh_token === 'string' && body.refresh_token) ||
    fromCookies.refreshToken ||
    '';
  return { access_token, refresh_token };
}
