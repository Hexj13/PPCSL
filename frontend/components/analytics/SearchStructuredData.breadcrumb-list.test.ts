/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

import { buildBreadcrumbItemList } from '@/components/analytics/SearchStructuredData';
import { getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

describe('buildBreadcrumbItemList', () => {
  const siteUrl = loadSiteConfigSync(getCountry()).siteUrl.replace(/\/$/, '');
  const t = getServerTranslations('ro');

  it('returns only home when no brand is selected', () => {
    const items = buildBreadcrumbItemList(null, null, null, null, siteUrl, 'ro', t);
    expect(items).toHaveLength(1);
    expect(items[0]?.position).toBe(1);
  });

  it('returns two items with distinct URLs for brand-only', () => {
    const items = buildBreadcrumbItemList('dacia', null, null, null, siteUrl, 'ro', t);
    expect(items).toHaveLength(2);
    expect(items[0]?.item).not.toBe(items[1]?.item);
  });

  it('returns three distinct item URLs for brand and model', () => {
    const items = buildBreadcrumbItemList('dacia', 'duster', null, null, siteUrl, 'ro', t);
    expect(items).toHaveLength(3);
    const urls = items.map((x) => x.item);
    expect(new Set(urls).size).toBe(3);
  });
});
