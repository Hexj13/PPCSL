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

export function loadFaqSync(country: string): FAQConfig | null {
  try {
    const module = require(`./config/faq`);
    return (module?.default || null) as FAQConfig | null;
  } catch {
    console.warn(
      `FAQ config file not found for ${country}, using fallback FAQ. This is expected in core repository.`
    );
    return null;
  }
}
