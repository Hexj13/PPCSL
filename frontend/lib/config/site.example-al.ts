import { SiteConfig } from '../site-config';

const config: SiteConfig = {
  country: 'al',
  name: 'AutoShqip',
  domain: 'autoshqip.al',
  locale: 'sq-AL',
  currency: 'EUR',
  currencies: ['EUR', 'ALL'] as const,
  countryCode: 'AL',
  supportEmail: 'support@autoshqip.al',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://autoshqip.al',
};

export default config;
