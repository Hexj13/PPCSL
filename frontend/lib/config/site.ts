import { SiteConfig } from '../site-config';

const config: SiteConfig = {
  country: 'mk',
  name: 'Kupito',
  domain: 'kupito.club',
  locale: 'mk_MK',
  currency: 'MKD',
  countryCode: 'MK',
  supportEmail: 'support@kupito.club',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club',
};

export default config;
