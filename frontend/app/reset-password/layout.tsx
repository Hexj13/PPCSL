import type { Metadata } from 'next';

import { getServerTranslations } from '@/lib/i18n';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerTranslations('mk');

  return {
    title: t.metadata.resetPassword.title,
    description: t.metadata.resetPassword.description,
    openGraph: {
      type: 'website',
      url: `${siteUrl}/reset-password`,
      title: t.metadata.resetPassword.ogTitle,
      description: t.metadata.resetPassword.ogDescription,
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: t.metadata.resetPassword.ogAlt,
        },
      ],
      siteName: 'Kupito',
      locale: 'mk_MK',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.metadata.resetPassword.ogTitle,
      description: t.metadata.resetPassword.ogDescription,
      images: [`${siteUrl}/og-image.jpg`],
    },
  };
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
