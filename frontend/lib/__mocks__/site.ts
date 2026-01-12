import { SiteConfig } from '../site-config';

const config: SiteConfig = {
  country: 'mk',
  name: 'Test',
  domain: 'test.com',
  locale: 'mk-MK',
  currency: 'MKD',
  currencies: ['MKD', 'EUR'] as const,
  countryCode: 'MK',
  supportEmail: 'support@test.com',
  siteUrl: 'https://test.com',
};

export default config;
