import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

export const metadata: Metadata = {
  title: 'Ресетирање на лозинка',
  description:
    'Ресетирајте ја вашата лозинка на Kupito. Внесете го вашиот телефонски број и следете ги чекорите за ресетирање на лозинката преку SMS верификација.',
  openGraph: {
    type: 'website',
    url: `${siteUrl}/reset-password`,
    title: 'Ресетирање на лозинка - Kupito',
    description:
      'Ресетирајте ја вашата лозинка на Kupito. Внесете го вашиот телефонски број и следете ги чекорите за ресетирање на лозинката преку SMS верификација.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Kupito - Ресетирање на лозинка',
      },
    ],
    siteName: 'Kupito',
    locale: 'mk_MK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ресетирање на лозинка - Kupito',
    description:
      'Ресетирајте ја вашата лозинка на Kupito. Внесете го вашиот телефонски број и следете ги чекорите за ресетирање на лозинката преку SMS верификација.',
    images: [`${siteUrl}/og-image.jpg`],
  },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
