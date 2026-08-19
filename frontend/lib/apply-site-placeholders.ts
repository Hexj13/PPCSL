import type { SiteConfig } from './site-config';

export function applySitePlaceholders(
  text: string,
  site: Pick<SiteConfig, 'supportEmail' | 'siteUrl' | 'domain'>,
): string {
  return text
    .replaceAll('{supportEmail}', site.supportEmail)
    .replaceAll('{siteUrl}', site.siteUrl)
    .replaceAll('{domain}', site.domain);
}
