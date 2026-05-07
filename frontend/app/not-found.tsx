import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { getMetadataLocale, loadTranslations } from '@/lib/i18n';
import { loadSiteConfig } from '@/lib/site-config';
import { localePrefixPath } from '@/lib/url-locale';
import { getCountry } from '@/lib/utils';

const actionButtonClassName =
  'w-full sm:w-auto sm:max-w-fit h-12 py-2 sm:h-auto sm:min-h-0 sm:py-3.5 md:py-2.5 px-8 text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none min-w-[220px] whitespace-nowrap';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMetadataLocale();
  const translations = loadTranslations(locale);
  const siteConfig = await loadSiteConfig(getCountry());
  return {
    title: `${translations.notFound.heading} | ${siteConfig.name}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function NotFound() {
  const locale = await getMetadataLocale();
  const translations = loadTranslations(locale);
  const homeHref = localePrefixPath('/', locale);

  return (
    <div
      className="min-h-screen bg-bg-base flex items-center justify-center px-4"
      data-error-page="true"
    >
      <div className="text-center max-w-2xl w-full">
        <div className="mb-8">
          <div className="mb-1 flex justify-center">
            <Image
              src="/eye-of-providence.png"
              alt={translations.notFound.imageAlt}
              width={64}
              height={64}
              className="w-16 h-16"
              draggable={false}
            />
          </div>
          <h1 className="text-6xl md:text-7xl font-extrabold bg-linear-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent mb-4">
            {translations.notFound.title}
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
            {translations.notFound.heading}
          </h2>
          <p className="text-text-secondary text-base mb-8">{translations.notFound.description}</p>
        </div>

        <div className="flex justify-center">
          <Link href={homeHref} className={actionButtonClassName}>
            {translations.notFound.backToHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
