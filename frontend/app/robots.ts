import type { MetadataRoute } from 'next';

import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  const siteConfig = loadSiteConfigSync(getCountry());
  const siteUrl = siteConfig.siteUrl;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/sign',
          '/reset-password',
          '/verify-email',
          '/verify-phone',
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
        ],
      },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/sitemap.txt`],
  };
}
