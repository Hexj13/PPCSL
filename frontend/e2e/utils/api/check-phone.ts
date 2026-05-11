import type { APIRequestContext } from '@playwright/test';

import { buildUniqueMdPhone } from '../../fixtures/env';

const API_BASE_URL = process.env.API_URL ?? process.env.E2E_API_URL ?? 'http://localhost:4000';

export async function buildAvailableMdPhone(request: APIRequestContext): Promise<string> {
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}/api/auth/check-phone`;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidatePhone = buildUniqueMdPhone();
    const response = await request.post(url, {
      data: { phone: candidatePhone },
    });

    if (response.ok()) {
      const payload = (await response.json()) as { available?: boolean };
      if (payload.available !== false) {
        return candidatePhone;
      }
      continue;
    }

    if (response.status() === 400) {
      continue;
    }

    throw new Error(`Phone availability check failed with status ${response.status()}`);
  }

  throw new Error('Unable to allocate an available phone number for e2e registration');
}
