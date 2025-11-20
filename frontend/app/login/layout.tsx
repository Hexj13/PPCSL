import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

export const metadata: Metadata = {
  title: 'Најава',
  description:
    'Најавете се на вашиот Kupito профил за да управувате со вашите огласи, видите омилени автомобили и зачуваните филтри. Пристап до профилот со email или телефон.',
  openGraph: {
    type: 'website',
    url: `${siteUrl}/login`,
    title: 'Најава - Kupito',
    description:
      'Најавете се на вашиот Kupito профил за да управувате со вашите огласи, да ги видите вашите омилени автомобили и зачуваните филтри за пребарување. Пристап до вашиот профил со email или телефон.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Kupito - Најава',
      },
    ],
    siteName: 'Kupito',
    locale: 'mk_MK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Најава - Kupito',
    description:
      'Најавете се на вашиот Kupito профил за да управувате со вашите огласи, да ги видите вашите омилени автомобили и зачуваните филтри за пребарување. Пристап до вашиот профил со email или телефон.',
    images: [`${siteUrl}/og-image.jpg`],
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
