import type { Metadata } from 'next';

import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

const siteConfig = loadSiteConfigSync(getCountry());
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
    canonical: `${siteUrl}/my-listings`,
  },
};

export default function MyListingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
