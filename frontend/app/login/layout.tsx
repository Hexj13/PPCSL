import type { Metadata } from 'next';

import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

const country = getCountry();
const siteConfig = loadSiteConfigSync(country);
const siteUrl = siteConfig.siteUrl;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);

  return {
    title: t.metadata.login.title,
    description: t.metadata.login.description,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    alternates: {
      canonical: `${siteUrl}/login`,
    },
    openGraph: {
      type: 'website',
      url: `${siteUrl}/login`,
      title: t.metadata.login.ogTitle,
      description: t.metadata.login.ogDescription,
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: t.metadata.login.ogAlt,
        },
      ],
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t.metadata.login.ogTitle,
      description: t.metadata.login.ogDescription,
      images: [`${siteUrl}/og-image.jpg`],
    },
  };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
