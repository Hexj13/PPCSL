import type { Metadata } from 'next';

import { getMetadataLocaleFromParams, getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const siteUrl = siteConfig.siteUrl;
  const locale = await getMetadataLocaleFromParams(params);
  const t = getServerTranslations(locale);

  return {
    title: t.metadata.investors.title,
    description: t.metadata.investors.description,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    openGraph: {
      type: 'website',
      url: `${siteUrl}/investors`,
      title: t.metadata.investors.ogTitle,
      description: t.metadata.investors.ogDescription,
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: t.metadata.investors.ogAlt,
        },
      ],
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t.metadata.investors.ogTitle,
      description: t.metadata.investors.ogDescription,
      images: [`${siteUrl}/og-image.jpg`],
    },
    alternates: {
      canonical: `${siteUrl}/investors`,
    },
  };
}

export default function InvestorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
