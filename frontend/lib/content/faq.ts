export type FAQItem = {
  id: string;
  question: string;
  answer: string | string[];
};

export type FAQScenario = {
  id: string;
  title: string;
  steps: string[];
};

export type FAQConfig = {
  items: FAQItem[];
  scenarios: FAQScenario[];
};

export type FAQConfigWithLanguages = {
  ro?: FAQConfig;
  ru?: FAQConfig;
  en?: FAQConfig;
};

export function loadFaqSync(country: string, locale?: string): FAQConfig | null {
  try {
    const module = require(`../config/faq`);
    const faqData = (module?.default || null) as FAQConfigWithLanguages | FAQConfig | null;

    if (!faqData) {
      return null;
    }

    if ('ro' in faqData || 'ru' in faqData || 'en' in faqData) {
      const configWithLanguages = faqData as FAQConfigWithLanguages;
      const currentLocale = locale || (country === 'md' ? 'ro' : 'ro');

      if (currentLocale === 'ro' && configWithLanguages.ro) {
        return configWithLanguages.ro;
      }
      if (currentLocale === 'ru' && configWithLanguages.ru) {
        return configWithLanguages.ru;
      }
      if (configWithLanguages.en) {
        return configWithLanguages.en;
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
