/**
 * @jest-environment node
 */
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('./globals.css', () => ({}));
jest.mock('next/font/google', () => ({
  Inter: () => ({ className: 'inter-mock' }),
}));

import { generateMetadata } from './[locale]/layout';

describe('locale layout generateMetadata openGraph.url', () => {
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
  });

  it('prefixes openGraph.url with /ru when locale param is ru', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'ru' }) });
    const url = String(meta.openGraph?.url ?? '');
    expect(url.endsWith('/ru') || url.endsWith('/ru/')).toBe(true);
  });

  it('does not add /ru segment to openGraph.url for ro locale', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'ro' }) });
    const url = String(meta.openGraph?.url ?? '');
    expect(url).not.toMatch(/\/ru(\/|$)/);
  });
});
