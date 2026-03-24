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
    title: t.metadata.sign.title,
    description: t.metadata.sign.description,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    alternates: {
      canonical: `${siteUrl}/sign`,
    },
    openGraph: {
      type: 'website',
      url: `${siteUrl}/sign`,
      title: t.metadata.sign.ogTitle,
      description: t.metadata.sign.ogDescription,
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: t.metadata.sign.ogAlt,
        },
      ],
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t.metadata.sign.ogTitle,
      description: t.metadata.sign.ogDescription,
      images: [`${siteUrl}/og-image.jpg`],
    },
  };
}

export default function SignLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
