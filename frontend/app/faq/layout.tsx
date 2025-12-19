import type { Metadata } from 'next';

import { loadSiteConfigSync } from '@/lib/site-config';

const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
const siteConfig = loadSiteConfigSync(country);
const siteUrl = siteConfig.siteUrl;

export const metadata: Metadata = {
  title: 'Често поставувани прашања (FAQ)',
  description:
    'Најдете одговори на најчестите прашања за Kupito. Дознајте како да објавите оглас, управувате со вашите огласи, пребарувате и споредувате автомобили.',
  openGraph: {
    type: 'website',
    url: `${siteUrl}/faq`,
    title: 'Често поставувани прашања (FAQ) - Kupito',
    description:
      'Најдете одговори на најчестите прашања за Kupito. Дознајте како да објавите оглас, како да управувате со вашите огласи, како да пребарувате и споредувате автомобили, и многу повеќе.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Kupito - Често поставувани прашања',
      },
    ],
    siteName: siteConfig.name,
    locale: siteConfig.locale,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Често поставувани прашања (FAQ) - Kupito',
    description:
      'Најдете одговори на најчестите прашања за Kupito. Дознајте како да објавите оглас, како да управувате со вашите огласи, како да пребарувате и споредувате автомобили, и многу повеќе.',
    images: [`${siteUrl}/og-image.jpg`],
  },
  alternates: {
    canonical: `${siteUrl}/faq`,
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
