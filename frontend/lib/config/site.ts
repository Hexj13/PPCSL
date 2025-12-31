import { SiteConfig } from '../site-config';

const config: SiteConfig = {
  country: 'mk',
  name: 'Test',
  domain: 'test.com',
  locale: 'mk_MK',
  currency: 'MKD',
  countryCode: 'MK',
  supportEmail: 'support@test.com',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://test.com',
};

export default config;
