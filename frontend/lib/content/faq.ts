import type { FAQConfig, FAQConfigWithLanguages } from '@/lib/config/faq-types';

export type {
  FAQItem,
  FAQScenario,
  FAQConfig,
  FAQConfigWithLanguages,
} from '@/lib/config/faq-types';

export function loadFaqSync(country: string, locale?: string): FAQConfig | null {
  try {
    const module = require(`../config/faq`);
    const faqData = (module?.default || null) as FAQConfigWithLanguages | FAQConfig | null;

    if (!faqData) {
      return null;
    }

    if ('ro' in faqData || 'ru' in faqData || 'en' in faqData || 'sq' in faqData) {
      const configWithLanguages = faqData as FAQConfigWithLanguages;
      const currentLocale = (locale || (country === 'al' ? 'sq' : 'ro')).toLowerCase();

      const byLocale = configWithLanguages[currentLocale as keyof FAQConfigWithLanguages];
      if (byLocale) {
        return byLocale;
      }
      if (configWithLanguages.en) {
        return configWithLanguages.en;
      }
      if (configWithLanguages.sq) {
        return configWithLanguages.sq;
      }
      if (configWithLanguages.ro) {
        return configWithLanguages.ro;
      }
      return null;
    }

    return faqData as FAQConfig;
  } catch {
    console.warn(
      `FAQ config file not found for ${country}, using fallback FAQ. This is expected in core repository.`,
    );
    return null;
  }
}
