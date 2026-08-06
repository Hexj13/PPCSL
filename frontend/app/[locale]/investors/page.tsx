import {
  getMetadataLocaleFromParams,
  getServerTranslations,
  type LocaleRouteParams,
} from '@/lib/i18n';
import type { Translations } from '@/lib/i18n-types';

import { InvestorsPageClient } from './InvestorsPageClient';

export default async function InvestorsPage({ params }: { params: Promise<LocaleRouteParams> }) {
  const locale = await getMetadataLocaleFromParams(params);
  const translations = getServerTranslations(locale);
  return (
    <InvestorsPageClient
      initialLocale={locale}
      initialInvestors={(translations as Translations).investors}
    />
  );
}
