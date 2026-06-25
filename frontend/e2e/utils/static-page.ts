import fs from 'node:fs';
import path from 'node:path';

import { expect, type Page } from '@playwright/test';

import { pathnameWithoutLocalePrefix } from './app-path';
import { t } from './i18n';

type StaticPageExpectation = {
  headingKey?: string;
  headingText?: string;
  skipHeaderFooter?: boolean;
};

function loadEnInvestorsTitle(): string {
  const localePath = path.resolve(process.cwd(), 'lib/locales/en.json');
  const locale = JSON.parse(fs.readFileSync(localePath, 'utf8')) as {
    investors?: { title?: string };
  };
  const title = locale.investors?.title;
  if (!title) {
    throw new Error('Missing investors.title in en locale for E2E static page expectation');
  }
  return title;
}

const STATIC_PAGE_EXPECTATIONS: Record<string, StaticPageExpectation> = {
  '/terms': { headingText: 'Termeni și condiții' },
  '/privacy': { headingText: 'Politica de confidențialitate' },
  '/faq': { headingKey: 'faq.title' },
  '/contacts': { headingKey: 'contacts.title' },
  '/partners': { headingKey: 'partners.title' },
  '/investors': { headingText: loadEnInvestorsTitle() },
  '/cookie-settings': { headingKey: 'cookieSettings.title' },
  '/offline': { headingKey: 'pwa.offline', skipHeaderFooter: true },
};

export async function expectStaticPageView(page: Page, route: string): Promise<void> {
  const expectation = STATIC_PAGE_EXPECTATIONS[route];
  if (!expectation) {
    throw new Error(`Missing static page expectation for route: ${route}`);
  }

  await expect(page).toHaveURL((url) => pathnameWithoutLocalePrefix(url) === route);
  const heading = expectation.headingText ?? t(expectation.headingKey!);
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();

  if (!expectation.skipHeaderFooter) {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  }
}
