import type { Metadata } from 'next';

import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const siteUrl = siteConfig.siteUrl;
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);

  return {
    title: t.metadata.faq.title,
    description: t.metadata.faq.description,
    openGraph: {
      type: 'website',
      url: `${siteUrl}/faq`,
      title: t.metadata.faq.ogTitle,
      description: t.metadata.faq.ogDescription,
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: t.metadata.faq.ogAlt,
        },
      ],
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t.metadata.faq.ogTitle,
      description: t.metadata.faq.ogDescription,
      images: [`${siteUrl}/og-image.jpg`],
    },
    alternates: {
      canonical: `${siteUrl}/faq`,
    },
  };
}

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
