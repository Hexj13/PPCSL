'use client';

import { useTranslation } from '@/hooks/useTranslation';

export function HomeHero() {
  const { t } = useTranslation();

  return (
    <div className="mb-8 md:mb-12 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-primary-400/5 to-transparent rounded-2xl blur-3xl -z-10" />
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 md:mb-6 leading-tight pl-4 md:pl-5">
        <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent drop-shadow-lg">
          {t('home.title')}
        </span>
      </h1>
      <p className="text-xl md:text-2xl font-medium leading-relaxed tracking-wide pl-4 md:pl-5">
        <span className="text-white">{t('home.subtitle')} </span>
        <span className="text-primary-500 font-bold">{t('home.subtitleBold')}</span>
        <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {' '}
          {t('home.subtitle2')}{' '}
        </span>
        <span className="bg-gradient-to-r from-primary-400 to-[#3ECA74] bg-clip-text text-transparent">
          {t('home.subtitle3')}
        </span>
      </p>
    </div>
  );
}
