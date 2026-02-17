import type { MetadataRoute } from 'next';

import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { loadThemeSync } from '@/lib/theme';
import { getCountry } from '@/lib/utils';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const theme = loadThemeSync(country);
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);

  return {
    name: `${siteConfig.name} - ${t.home.title}`,
    short_name: siteConfig.name,
    description: `${t.home.subtitle} ${t.home.subtitleBold} ${t.home.subtitle2} ${t.home.subtitle3}`,
    start_url: '/',
    display: 'standalone',
    background_color: theme.pwa?.backgroundColor || '#0f172a',
    theme_color: theme.pwa?.themeColor || '#3b82f6',
    icons: [
      {
        src: '/pwa192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['automotive', 'shopping', 'marketplace'],
    lang: locale,
    dir: 'ltr',
    orientation: 'portrait',
  };
}
