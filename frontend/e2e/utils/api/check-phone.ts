import type { APIRequestContext } from '@playwright/test';

import { buildUniqueMdPhone } from '../../fixtures/env';
import { getE2eBackendApiOrigin } from '../api-origin';

export async function buildAvailableMdPhone(request: APIRequestContext): Promise<string> {
  const base = getE2eBackendApiOrigin();
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
