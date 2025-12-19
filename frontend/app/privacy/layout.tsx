import type { Metadata } from 'next';

import { loadSiteConfigSync } from '@/lib/site-config';

const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
const siteConfig = loadSiteConfigSync(country);
const siteUrl = siteConfig.siteUrl;

export const metadata: Metadata = {
  title: 'Политика за приватност',
  description:
    'Дознајте како Kupito собира, користи и заштитува вашите лични податоци. Прочитајте ја политиката за приватност и обработка на податоци во согласност со GDPR.',
  openGraph: {
    type: 'website',
    url: `${siteUrl}/privacy`,
    title: 'Политика за приватност - Kupito',
    description:
      'Дознајте како Kupito собира, користи и заштитува вашите лични податоци. Прочитајте ја нашата политика за приватност за да разберете како ги обработуваме вашите податоци во согласност со GDPR.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Kupito - Политика за приватност',
      },
    ],
    siteName: siteConfig.name,
    locale: siteConfig.locale,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Политика за приватност - Kupito',
    description:
      'Дознајте како Kupito собира, користи и заштитува вашите лични податоци. Прочитајте ја нашата политика за приватност за да разберете како ги обработуваме вашите податоци во согласност со GDPR.',
    images: [`${siteUrl}/og-image.jpg`],
  },
  alternates: {
    canonical: `${siteUrl}/privacy`,
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
