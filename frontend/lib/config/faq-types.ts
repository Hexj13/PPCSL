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
  sq?: FAQConfig;
};
