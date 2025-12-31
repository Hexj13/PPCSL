export interface SiteConfig {
  country: string;
  name: string;
  domain: string;
  locale: string;
  currency: string;
  countryCode: string;
  supportEmail: string;
  siteUrl: string;
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
      config = module.default;
      return config;
    }
    throw new Error('Module not found');
  } catch (error) {
    console.warn(`Site config file not found for ${country}, using default config. This is expected in core repository.`);
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
  country: 'mk',
  name: 'PPCSL',
  domain: 'ppcsl.com',
  locale: 'mk_MK',
  currency: 'MKD',
  countryCode: 'MK',
  supportEmail: 'support@ppcsl.com',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://ppcsl.com',
};

export function loadSiteConfigSync(country: string): SiteConfig {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const configModule = require(`./config/site`);
    return configModule.default;
  } catch (error) {
    console.warn(`Site config file not found for ${country}, using default config. This is expected in core repository.`);
    return defaultConfig;
  }
}
