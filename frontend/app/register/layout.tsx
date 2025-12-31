import type { Metadata } from 'next';

import { getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';

const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
const siteConfig = loadSiteConfigSync(country);
const siteUrl = siteConfig.siteUrl;

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerTranslations();

  return {
    title: t.metadata.register.title,
    description: t.metadata.register.description,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    alternates: {
      canonical: `${siteUrl}/register`,
    },
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
      siteName: siteConfig.name,
      locale: siteConfig.locale,
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
