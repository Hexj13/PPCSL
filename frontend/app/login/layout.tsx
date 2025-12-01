import type { Metadata } from 'next';

import { getServerTranslations } from '@/lib/i18n';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerTranslations('mk');

  return {
    title: t.metadata.login.title,
    description: t.metadata.login.description,
    openGraph: {
      type: 'website',
      url: `${siteUrl}/login`,
      title: t.metadata.login.ogTitle,
      description: t.metadata.login.ogDescription,
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: t.metadata.login.ogAlt,
        },
      ],
      siteName: 'Kupito',
      locale: 'mk_MK',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.metadata.login.ogTitle,
      description: t.metadata.login.ogDescription,
      images: [`${siteUrl}/og-image.jpg`],
    },
  };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
