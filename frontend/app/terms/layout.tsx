import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

export const metadata: Metadata = {
  title: 'Услови за користење',
  description:
    'Прочитајте ги условите за користење на Kupito. Дознајте ги правилата, одговорностите и правата при користење на платформата за објавување огласи за автомобили.',
  openGraph: {
    type: 'website',
    url: `${siteUrl}/terms`,
    title: 'Услови за користење - Kupito',
    description:
      'Прочитајте ги условите за користење на Kupito. Дознајте ги правилата, одговорностите и правата при користење на платформата за објавување огласи за автомобили.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Kupito - Услови за користење',
      },
    ],
    siteName: 'Kupito',
    locale: 'mk_MK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Услови за користење - Kupito',
    description:
      'Прочитајте ги условите за користење на Kupito. Дознајте ги правилата, одговорностите и правата при користење на платформата за објавување огласи за автомобили.',
    images: [`${siteUrl}/og-image.jpg`],
  },
  alternates: {
    canonical: `${siteUrl}/terms`,
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
