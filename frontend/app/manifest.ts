import type { MetadataRoute } from 'next';

import { getVersionedAssetPath } from '@/lib/assets';
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
  const pwa192Url = getVersionedAssetPath('/pwa192.png', siteConfig.assetVersion);
  const logoUrl = getVersionedAssetPath('/logo.png', siteConfig.assetVersion);
  const backgroundColor = theme.pwa?.backgroundColor || '#F5F5F5';
  const themeColor = theme.pwa?.themeColor || '#40916B';
  const shortcutIcon = {
    src: pwa192Url,
    sizes: '192x192',
    type: 'image/png' as const,
  };

  return {
    name: `${siteConfig.name} - ${t.home.title}`,
    short_name: siteConfig.name,
    description: `${t.home.subtitle} ${t.home.subtitleBold} ${t.home.subtitle2} ${t.home.subtitle3}`,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'browser'],
    background_color: backgroundColor,
    theme_color: themeColor,
    icons: [
      {
        src: pwa192Url,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: pwa192Url,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['automotive', 'shopping', 'marketplace'],
    lang: locale,
    dir: 'ltr',
    orientation: 'portrait',
    shortcuts: [
      {
        name: t.common.search,
        short_name: t.common.search,
        url: '/',
        icons: [shortcutIcon],
      },
      {
        name: t.header.favorites,
        short_name: t.header.favorites,
        url: '/favorites',
        icons: [shortcutIcon],
      },
    ],
    screenshots: [
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'narrow',
        label: siteConfig.name,
      },
    ],
  };
}
