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
    title: t.header.createListing,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    alternates: {
      canonical: `${siteUrl}/listings/new`,
    },
  };
}

export default function NewListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
