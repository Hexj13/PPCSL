import type { Metadata } from 'next';

import { loadSiteConfigSync } from '@/lib/site-config';

const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
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
    canonical: `${siteUrl}/my-listings`,
  },
};

export default function MyListingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
