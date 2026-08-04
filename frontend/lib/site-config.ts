export interface ReportProviderConfig {
  baseUrls: Record<string, string>;
  demoUrls: Record<string, string>;
  partnerFrom: string;
}

export interface LocaleRoutingConfig {
  defaultLocale: string;
  supportedLocales: readonly string[];
  prefixedLocales: readonly string[];
  enableLegacyDefaultLocaleRedirect?: boolean;
  enableLegacyRoPathRedirect?: boolean;
  languageSwitcherTranslationKeys?: Readonly<Record<string, string>>;
}

export interface MobileAppConfig {
  enabled: boolean;
  androidUrl: string | null;
  iosUrl: string | null;
  androidPackageName?: string;
}

export interface SocialLinksConfig {
  tiktok?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
}

export interface SiteConfig {
  country: string;
  name: string;
  domain: string;
  locale: string;
  currency: string;
  currencies: readonly string[];
  countryCode: string;
  supportEmail: string;
  siteUrl: string;
  localeRouting?: LocaleRoutingConfig;
  assetVersion?: string;
  mobileApp?: MobileAppConfig;
  socialLinks?: SocialLinksConfig;
  footerPartnerLogoSurfaceDefault?: 'light' | 'transparent';
  footerPartners?: Array<{
    name: string;
    href: string;
    logoSrc: string;
    logoWidth?: number;
    logoHeight?: number;
    logoSurface?: 'light' | 'transparent';
    logoBackgroundColor?: string;
    descriptionKey?: string;
  }>;
  reportProvider?: ReportProviderConfig;
  /** UI locales mapped to description_ro / description_ru columns. Default: ['ro','ru']. */
  descriptionLocales?: readonly [string, string];
}

let config: SiteConfig | null = null;

export async function loadSiteConfig(country: string): Promise<SiteConfig> {
  if (config) {
    return config;
  }

  try {
    // Dynamic import may not exist in core repository
    // @ts-ignore - File may not exist in core, will be provided by platform repository
    const module = await import(`./config/site`).catch(() => null);
    if (module?.default) {
      const loadedConfig = module.default as SiteConfig;
      config = loadedConfig;
      return loadedConfig;
    }
    throw new Error('Module not found');
  } catch {
    console.warn(
      `Site config file not found for ${country}, using default config. This is expected in core repository.`,
    );
    config = defaultConfig;
    return defaultConfig;
  }
}

export function getSiteConfig(): SiteConfig {
  if (!config) {
    throw new Error('Site config not loaded. Call loadSiteConfig first.');
  }
  return config;
}

const defaultConfig: SiteConfig = {
  country: 'md',
  name: 'PPCSL',
  domain: 'ppcsl.com',
  locale: 'ro-MD',
  currency: 'EUR',
  currencies: ['EUR', 'MDL'] as const,
  countryCode: 'MD',
  supportEmail: 'support@ppcsl.com',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://ppcsl.com',
  mobileApp: {
    enabled: false,
    androidUrl: null,
    iosUrl: null,
  },
  localeRouting: {
    defaultLocale: 'ro',
    supportedLocales: ['ro', 'ru'],
    prefixedLocales: ['ru'],
    enableLegacyDefaultLocaleRedirect: true,
    languageSwitcherTranslationKeys: {
      ro: 'common.languageRo',
      ru: 'common.languageRu',
    },
  },
  descriptionLocales: ['ro', 'ru'],
};

export function loadSiteConfigSync(country: string): SiteConfig {
  try {
    const configModule = require(`./config/site`);
    return configModule.default;
  } catch {
    console.warn(
      `Site config file not found for ${country}, using default config. This is expected in core repository.`,
    );
    return defaultConfig;
  }
}
