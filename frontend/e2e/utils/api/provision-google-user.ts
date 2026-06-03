import type { Page } from '@playwright/test';

import { getE2eBackendApiOrigin } from '../api-origin';

export type ProvisionedGoogleBusinessUser = {
  phone: string;
  email: string;
};

export async function provisionGoogleBusinessUser(
  page: Page,
): Promise<ProvisionedGoogleBusinessUser> {
  const apiOrigin = getE2eBackendApiOrigin();
  const payload = await page.evaluate(async (origin) => {
    const response = await fetch(`${origin}/api/auth/e2e/google-business-user`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `POST /api/auth/e2e/google-business-user failed: HTTP ${response.status} ${body}`,
      );
    }
    return response.json() as Promise<{
      user?: { phone?: string | null; email?: string | null };
    }>;
  }, apiOrigin);

  const phone = payload.user?.phone?.trim();
  const email = payload.user?.email?.trim();
  if (!phone || !email) {
    throw new Error('E2E Google business provision response missing phone or email');
  }
  return { phone, email };
}
