import type { MetadataRoute } from 'next';

import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

const PRIVATE_PATHS = [
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
];

export default function robots(): MetadataRoute.Robots {
  const siteConfig = loadSiteConfigSync(getCountry());
  const siteUrl = siteConfig.siteUrl;

  const ruMirrored = PRIVATE_PATHS.map((p) => `/ru${p}`);

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', ...PRIVATE_PATHS, ...ruMirrored],
      },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/sitemap.txt`],
  };
}
