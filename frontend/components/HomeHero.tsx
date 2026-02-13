'use client';

import { ComponentProps } from 'react';

import { TranslatedText } from '@/components/common/TranslatedText';
import { useTranslation } from '@/hooks/useTranslation';

export interface HomeHeroProps extends ComponentProps<'div'> {
  title?: string;
  subtitle?: string;
  subtitleBold?: string;
  subtitle2?: string;
  subtitle3?: string;
}

export function HomeHero({
  title: titleProp,
  subtitle: subtitleProp,
  subtitleBold: subtitleBoldProp,
  subtitle2: subtitle2Prop,
  subtitle3: subtitle3Prop,
  className,
  ...props
}: HomeHeroProps) {
  const { t } = useTranslation();

  const title = titleProp ?? t('home.title');
  const subtitle = subtitleProp ?? t('home.subtitle');
  const subtitleBold = subtitleBoldProp ?? t('home.subtitleBold');
  const subtitle2 = subtitle2Prop ?? t('home.subtitle2');
  const subtitle3 = subtitle3Prop ?? t('home.subtitle3');

  return (
    <div className={`mb-8 ${className || ''}`} {...props} suppressHydrationWarning>
      <h1
        className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 md:mb-6 leading-tight text-primary-900"
        suppressHydrationWarning
      >
        {title}
      </h1>
      <p
        className="text-xl md:text-2xl font-medium leading-relaxed tracking-wide text-primary-900"
        suppressHydrationWarning
      >
        <TranslatedText>{subtitle}</TranslatedText>
        <TranslatedText className="text-primary-500 font-bold"> {subtitle3}</TranslatedText>
        <TranslatedText>{subtitle2}</TranslatedText>
        <TranslatedText className="text-primary-500 font-bold">{subtitleBold}</TranslatedText>
      </p>
    </div>
  );
}
