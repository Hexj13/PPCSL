import type { Locale } from '@/lib/i18n-types';

export function LocaleHtmlLangScript({ locale }: { locale: Locale }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.documentElement.lang=${JSON.stringify(locale)};`,
      }}
    />
  );
}
