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
    const module = await import(`./config/site`);
    config = module.default;
    return config;
  } catch (error) {
    console.error(`Failed to load site config for ${country}:`, error);
    throw new Error(`Site config for ${country} not found`);
  }
}

export function getSiteConfig(): SiteConfig {
  if (!config) {
    throw new Error('Site config not loaded. Call loadSiteConfig first.');
  }
  return config;
}

export function loadSiteConfigSync(country: string): SiteConfig {
  try {
    const configModule = require(`./config/site`);
    return configModule.default;
  } catch (error) {
    console.error(`Failed to load site config for ${country}:`, error);
    throw new Error(`Site config for ${country} not found`);
  }
}
