import type { Metadata } from 'next';

import { getMetadataLocaleFromParams, getServerTranslations } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await getMetadataLocaleFromParams(params);
  const t = getServerTranslations(locale);
  return {
    title: t.profile.title,
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

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
