import type { Metadata } from 'next';

import { getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

const country = getCountry();
const siteConfig = loadSiteConfigSync(country);
const siteUrl = siteConfig.siteUrl;

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerTranslations();

  return {
    title: t.metadata.resetPassword.title,
    description: t.metadata.resetPassword.description,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    alternates: {
      canonical: `${siteUrl}/reset-password`,
    },
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
      siteName: siteConfig.name,
      locale: siteConfig.locale,
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
