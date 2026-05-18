import type { BrowserContext, Page } from '@playwright/test';

import { getE2eAppOrigin } from './api-origin';

const COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60;

function cookiePayloadForAppUrl(appUrl: string) {
  const origin = appUrl.replace(/\/$/, '');
  const expires = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_SEC;
  return {
    url: origin,
    expires,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  };
}

export async function applyDefaultLocaleCookiesToBrowserContext(
  context: BrowserContext,
  appBaseUrl: string,
): Promise<void> {
  const base = cookiePayloadForAppUrl(appBaseUrl);
  await context.addCookies([
    { ...base, name: 'kupito-locale', value: 'ro' },
    { ...base, name: 'kupito-preferred-locale', value: 'ro' },
  ]);
}

function resolveAppOriginForCookies(page: Page): string | null {
  const raw = page.url();
  if (raw.startsWith('http')) {
    return new URL(raw).origin;
  }
  return getE2eAppOrigin();
}

export async function forceDefaultCanonicalLocaleCookies(page: Page): Promise<void> {
  const origin = resolveAppOriginForCookies(page);
  if (!origin) {
    return;
  }
  const base = cookiePayloadForAppUrl(origin);
  await page.context().addCookies([
    { ...base, name: 'kupito-locale', value: 'ro' },
    { ...base, name: 'kupito-preferred-locale', value: 'ro' },
  ]);
}
