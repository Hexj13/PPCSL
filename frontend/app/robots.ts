import type { MetadataRoute } from 'next';

import { resolveLocaleRouting } from '@/lib/locale-routing';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

const PRIVATE_PATHS = [
  '/sign',
  '/reset-password',
  '/verify-email',
  '/verify-phone',
  '/profile',
  '/profile/',
  '/favorites',
  '/my-listings',
  '/listings/new',
  '/listings/*/edit',
  '/complete-profile',
  '/compare',
  '/design-system',
  '/offline',
  '/color-palette',
];

export default function robots(): MetadataRoute.Robots {
  const siteConfig = loadSiteConfigSync(getCountry());
  const siteUrl = siteConfig.siteUrl;
  const routing = resolveLocaleRouting(siteConfig);
  const mirrored = routing.prefixedLocales.flatMap((seg) =>
    PRIVATE_PATHS.map((p) => `/${seg}${p}`),
  );

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', ...PRIVATE_PATHS, ...mirrored],
      },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/sitemap.txt`],
  };
}
