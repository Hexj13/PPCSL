import type { Metadata } from 'next';

import { getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';

export async function generateMetadata(): Promise<Metadata> {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'md';
  const siteConfig = loadSiteConfigSync(country);
  const siteUrl = siteConfig.siteUrl;
  const t = getServerTranslations();

  return {
    title: t.metadata.cookieSettings.title,
    description: t.metadata.cookieSettings.description,
    openGraph: {
      type: 'website',
      url: `${siteUrl}/cookie-settings`,
      title: t.metadata.cookieSettings.ogTitle,
      description: t.metadata.cookieSettings.ogDescription,
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: t.metadata.cookieSettings.ogAlt,
        },
      ],
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t.metadata.cookieSettings.ogTitle,
      description: t.metadata.cookieSettings.ogDescription,
      images: [`${siteUrl}/og-image.jpg`],
    },
    alternates: {
      canonical: `${siteUrl}/cookie-settings`,
    },
  };
}

export default function CookieSettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
