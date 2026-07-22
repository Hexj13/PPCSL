import type { Translations } from '@/lib/i18n-types';
import en from '@/lib/locales/en.json';

import { InvestorsPageClient } from './InvestorsPageClient';

export default function InvestorsPage() {
  return <InvestorsPageClient initialInvestors={(en as unknown as Translations).investors} />;
}
