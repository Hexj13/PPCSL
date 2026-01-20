import { MetadataRoute } from 'next';

import { loadSiteConfigSync } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  const siteConfig = loadSiteConfigSync(country);
  const siteUrl = siteConfig.siteUrl;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/login',
          '/register',
          '/reset-password',
          '/verify-email',
          '/verify-phone',
          '/profile/',
          '/favorites',
          '/my-listings',
          '/listings/new',
          '/listings/*/edit',
          '/compare',
          '/design-system',
          '/offline',
          '/color-palette',
        ],
      },
    ],
    sitemap: [`${siteUrl}/sitemap.txt`, `${siteUrl}/sitemap.xml`],
  };
}
