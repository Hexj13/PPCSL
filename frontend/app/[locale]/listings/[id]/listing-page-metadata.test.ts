/**
 * @jest-environment node
 */
import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';

import { generateMetadata } from './page';

describe('listings/[id]/page generateMetadata not-found', () => {
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
  });

  it('uses locale-prefixed canonical for invalid listing id when locale is ru', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'ru', id: 'not-a-valid-id' }),
    });
    const canonical = meta.alternates?.canonical;
    expect(typeof canonical).toBe('string');
    expect(canonical).toContain('/ru/listings/');
    expect(canonical).toContain(encodeURIComponent('not-a-valid-id'));
  });

  it('uses RO canonical when locale is ro', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'ro', id: 'bad-id' }),
    });
    const canonical = meta.alternates?.canonical as string;
    expect(canonical).not.toMatch(/\/ru\/listings\//);
    expect(canonical).toContain('/listings/');
  });
});
