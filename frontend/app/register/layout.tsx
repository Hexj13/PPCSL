import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

export const metadata: Metadata = {
  title: 'Регистрација',
  description:
    'Регистрирајте се на Kupito и започнете да објавувате огласи за продажба на автомобили бесплатно. Креирајте профил за физичко или правно лице.',
  openGraph: {
    type: 'website',
    url: `${siteUrl}/register`,
    title: 'Регистрација - Kupito',
    description:
      'Регистрирајте се на Kupito и започнете да објавувате огласи за продажба на автомобили бесплатно. Креирајте профил за физичко или правно лице и стапете во контакт со купачи во Македонија.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Kupito - Регистрација',
      },
    ],
    siteName: 'Kupito',
    locale: 'mk_MK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Регистрација - Kupito',
    description:
      'Регистрирајте се на Kupito и започнете да објавувате огласи за продажба на автомобили бесплатно. Креирајте профил за физичко или правно лице и стапете во контакт со купачи во Македонија.',
    images: [`${siteUrl}/og-image.jpg`],
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
