/**
 * @jest-environment node
 */
import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import ReactDOMServer from 'react-dom/server';

import { OrganizationSchema } from '@/components/analytics/OrganizationSchema';
import { WebsiteSearchSchema } from '@/components/analytics/WebsiteSearchSchema';

function firstLdJsonFromMarkup(markup: string): Record<string, unknown> {
  const m = markup.match(/type="application\/ld\+json">(\{[\s\S]*?)<\/script>/);
  if (!m?.[1]) {
    throw new Error('ld+json script not found');
  }
  return JSON.parse(m[1]) as Record<string, unknown>;
}

describe('WebsiteSearchSchema', () => {
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
  });

  it('uses /ru base url when locale is ru', async () => {
    const el = await WebsiteSearchSchema({ locale: 'ru' });
    const view = ReactDOMServer.renderToString(el);
    const data = firstLdJsonFromMarkup(view);
    expect(String(data.url ?? '')).toMatch(/\/ru(\/|$)/);
    expect(
      String(
        (data.potentialAction as { target?: { urlTemplate?: string } })?.target?.urlTemplate ?? '',
      ),
    ).toContain('/ru/?title={search_term_string}');
    expect(data.inLanguage).toBe('ru');
  });

  it('uses RO base url when locale is ro', async () => {
    const el = await WebsiteSearchSchema({ locale: 'ro' });
    const view = ReactDOMServer.renderToString(el);
    const data = firstLdJsonFromMarkup(view);
    expect(String(data.url ?? '')).not.toMatch(/\/ru(\/|$)/);
    expect(data.inLanguage).not.toBe('ru');
  });
});

describe('OrganizationSchema', () => {
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
  });

  it('uses /ru organization url when locale is ru', async () => {
    const el = await OrganizationSchema({ locale: 'ru' });
    const view = ReactDOMServer.renderToString(el);
    const data = firstLdJsonFromMarkup(view);
    expect(String(data.url ?? '')).toMatch(/\/ru(\/|$)/);
    expect(data.inLanguage).toBe('ru');
  });

  it('uses RO organization url when locale is ro', async () => {
    const el = await OrganizationSchema({ locale: 'ro' });
    const view = ReactDOMServer.renderToString(el);
    const data = firstLdJsonFromMarkup(view);
    expect(String(data.url ?? '')).not.toMatch(/\/ru(\/|$)/);
  });
});
