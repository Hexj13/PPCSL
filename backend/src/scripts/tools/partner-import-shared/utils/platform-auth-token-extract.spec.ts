import {
  mergeKupitoAuthTokensFromBodyAndCookies,
  readKupitoAuthTokensFromSetCookieHeaders,
} from './kupito-auth-token-extract';

function responseWithSetCookie(lines: string[]): Response {
  const headers = new Headers();
  for (const line of lines) {
    headers.append('set-cookie', line);
  }
  return new Response(null, { status: 200, headers });
}

describe('readKupitoAuthTokensFromSetCookieHeaders', () => {
  it('extracts access and refresh token values from Set-Cookie', () => {
    const response = responseWithSetCookie([
      'kupito_access_token=aa.bb.cc; Path=/; HttpOnly',
      'kupito_refresh_token=dd.ee.ff; Path=/api/auth; HttpOnly',
    ]);
    expect(readKupitoAuthTokensFromSetCookieHeaders(response)).toEqual({
      accessToken: 'aa.bb.cc',
      refreshToken: 'dd.ee.ff',
    });
  });
});

describe('mergeKupitoAuthTokensFromBodyAndCookies', () => {
  it('prefers tokens from JSON body when both are present', () => {
    const response = responseWithSetCookie(['kupito_access_token=cookie-a; Path=/']);
    expect(
      mergeKupitoAuthTokensFromBodyAndCookies(
        { access_token: 'json-a', refresh_token: 'json-r' },
        response,
      ),
    ).toEqual({ access_token: 'json-a', refresh_token: 'json-r' });
  });

  it('uses Set-Cookie when JSON body omits tokens', () => {
    const response = responseWithSetCookie([
      'kupito_access_token=jwt-value; Path=/; HttpOnly',
      'kupito_refresh_token=refresh-value; Path=/api/auth; HttpOnly',
    ]);
    expect(mergeKupitoAuthTokensFromBodyAndCookies({}, response)).toEqual({
      access_token: 'jwt-value',
      refresh_token: 'refresh-value',
    });
  });
});
