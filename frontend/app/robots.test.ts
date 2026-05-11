import { resolveLocaleRouting } from '@/lib/locale-routing';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

import robots from './robots';

describe('robots', () => {
  it('disallows private paths and their /ru mirrors', () => {
    const r = robots();
    const disallow = r.rules[0]?.disallow;
    expect(Array.isArray(disallow)).toBe(true);
    const list = disallow as string[];
    expect(list).toContain('/profile');
    expect(list).toContain('/profile/');
    expect(list).toContain('/ru/profile/');
    expect(list).toContain('/favorites');
    expect(list).toContain('/ru/favorites');
    expect(list).toContain('/compare');
    expect(list).toContain('/ru/compare');
    expect(list).toContain('/my-listings');
    expect(list).toContain('/ru/my-listings');
    expect(list).toContain('/api/');
    expect(list).toContain('/admin/');
  });

  it('mirrors disallow for every prefixed locale from routing config', () => {
    const site = loadSiteConfigSync(getCountry());
    const { prefixedLocales } = resolveLocaleRouting(site);
    const r = robots();
    const list = r.rules[0]?.disallow as string[];
    for (const seg of prefixedLocales) {
      const prefix = `/${seg}`;
      expect(list).toContain(`${prefix}/sign`);
      expect(list).toContain(`${prefix}/profile`);
      expect(list).toContain(`${prefix}/compare`);
    }
  });
});
