import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const protocol =
    request.headers.get('x-forwarded-proto') ||
    (request.nextUrl.protocol === 'https:' ? 'https' : 'http');

  let needsRedirect = false;
  let redirectUrl: URL | null = null;

  if (url.pathname.endsWith('/') && url.pathname !== '/') {
    url.pathname = url.pathname.slice(0, -1);
    needsRedirect = true;
    redirectUrl = url;
  }

  if (hostname.startsWith('www.')) {
    const newHostname = hostname.replace('www.', '');
    const newUrl = new URL(request.url);
    newUrl.host = newHostname;
    if (redirectUrl) {
      redirectUrl.host = newHostname;
    } else {
      redirectUrl = newUrl;
    }
    needsRedirect = true;
  }

  if (protocol === 'http' && process.env.NODE_ENV === 'production') {
    const newUrl = redirectUrl || url.clone();
    newUrl.protocol = 'https:';
    redirectUrl = newUrl;
    needsRedirect = true;
  }

  if (needsRedirect && redirectUrl) {
    return NextResponse.redirect(redirectUrl, 301);
  }

  const response = NextResponse.next();

  if (process.env.NODE_ENV === 'development') {
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Accel-Expires', '0');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};

