import type { Metadata } from 'next';

import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

const country = getCountry();
const siteConfig = loadSiteConfigSync(country);
const siteUrl = siteConfig.siteUrl;

export const metadata: Metadata = {
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

export default function NewListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
