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
    title: t.metadata.privacy.title,
    description: t.metadata.privacy.description,
    openGraph: {
      type: 'website',
      url: `${siteUrl}/privacy`,
      title: t.metadata.privacy.ogTitle,
      description: t.metadata.privacy.ogDescription,
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: t.metadata.privacy.ogAlt,
        },
      ],
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t.metadata.privacy.ogTitle,
      description: t.metadata.privacy.ogDescription,
      images: [`${siteUrl}/og-image.jpg`],
    },
    alternates: {
      canonical: `${siteUrl}/privacy`,
    },
  };
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
