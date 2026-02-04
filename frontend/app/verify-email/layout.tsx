import type { Metadata } from 'next';

import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);
  return {
    title: t.verifyEmail.title,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
