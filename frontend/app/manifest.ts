import { MetadataRoute } from 'next';

import { getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { loadThemeSync } from '@/lib/theme';

export default function manifest(): MetadataRoute.Manifest {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'md';
  const siteConfig = loadSiteConfigSync(country);
  const theme = loadThemeSync(country);
  const t = getServerTranslations();

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
    lang: siteConfig.locale.split('-')[0],
    dir: 'ltr',
    orientation: 'portrait',
  };
}
