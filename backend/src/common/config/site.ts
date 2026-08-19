const config = {
  country: 'al',
  name: 'MakinaGuru',
  domain: 'makinaguru.com',
  locale: 'sq-AL',
  localeRouting: {
    defaultLocale: 'sq',
    supportedLocales: ['sq', 'en'],
    prefixedLocales: ['en'],
    enableLegacyDefaultLocaleRedirect: true,
    languageSwitcherTranslationKeys: {
      sq: 'common.languageSq',
      en: 'common.languageEn',
    },
  },
  descriptionLocales: ['sq', 'en'],
  currency: 'EUR',
  currencies: ['EUR', 'ALL'] as const,
  countryCode: 'AL',
  supportEmail: 'support@makinaguru.com',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://makinaguru.com',
  assetVersion: '202608191',
  mobileApp: {
    enabled: false,
    androidUrl: null,
    iosUrl: null,
    androidPackageName: 'com.makinaguru.app',
  },
  socialLinks: {},
  footerPartnerLogoSurfaceDefault: 'light',
  footerPartners: [],
  reportProvider: {
    baseUrls: {
      en: 'https://www.carvertical.com/en',
      sq: 'https://www.carvertical.com/en',
    },
    demoUrls: {
      en: 'https://www.carvertical.com/en/sample-report',
      sq: 'https://www.carvertical.com/en/sample-report',
    },
  },
};

export default config;
