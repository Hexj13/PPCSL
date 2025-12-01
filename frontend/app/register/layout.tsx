import type { Metadata } from 'next';

import { getServerTranslations } from '@/lib/i18n';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerTranslations('mk');

  return {
    title: t.metadata.register.title,
    description: t.metadata.register.description,
    openGraph: {
      type: 'website',
      url: `${siteUrl}/register`,
      title: t.metadata.register.ogTitle,
      description: t.metadata.register.ogDescription,
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: t.metadata.register.ogAlt,
        },
      ],
      siteName: 'Kupito',
      locale: 'mk_MK',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.metadata.register.ogTitle,
      description: t.metadata.register.ogDescription,
      images: [`${siteUrl}/og-image.jpg`],
    },
  };
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
