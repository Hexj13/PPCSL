import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

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
    siteName: 'Kupito',
    locale: 'mk_MK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Политика за приватност - Kupito',
    description:
      'Дознајте како Kupito собира, користи и заштитува вашите лични податоци. Прочитајте ја нашата политика за приватност за да разберете како ги обработуваме вашите податоци во согласност со GDPR.',
    images: [`${siteUrl}/og-image.jpg`],
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
