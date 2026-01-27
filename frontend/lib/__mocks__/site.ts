import { SiteConfig } from '../site-config';

const config: SiteConfig = {
  country: 'md',
  name: 'Test',
  domain: 'test.com',
  locale: 'ro-MD',
  currency: 'EUR',
  currencies: ['EUR', 'MDL'] as const,
  countryCode: 'MD',
  supportEmail: 'support@test.com',
  siteUrl: 'https://test.com',
};

export default config;
