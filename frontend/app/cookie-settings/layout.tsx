import type { Metadata } from 'next';

import { loadSiteConfigSync } from '@/lib/site-config';

const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
const siteConfig = loadSiteConfigSync(country);
const siteUrl = siteConfig.siteUrl;

export const metadata: Metadata = {
  title: 'Настройки за cookies',
  description:
    'Управувајте со вашите преференци за cookies на Kupito. Изберете кои cookies сакате да ги прифатите.',
  openGraph: {
    type: 'website',
    url: `${siteUrl}/cookie-settings`,
    title: 'Настройки за cookies - Kupito',
    description:
      'Управувајте со вашите преференци за cookies на Kupito. Изберете кои cookies сакате да ги прифатите.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Kupito - Настройки за cookies',
      },
    ],
    siteName: siteConfig.name,
    locale: siteConfig.locale,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Настройки за cookies - Kupito',
    description:
      'Управувајте со вашите преференци за cookies на Kupito. Изберете кои cookies сакате да ги прифатите.',
    images: [`${siteUrl}/og-image.jpg`],
  },
  alternates: {
    canonical: `${siteUrl}/cookie-settings`,
  },
};

export default function CookieSettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
