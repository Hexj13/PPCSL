import type { LocaleRoutingConfig, SiteConfig } from './site-config';

export type ResolvedLocaleRouting = {
  defaultLocale: string;
  supportedLocales: readonly string[];
  prefixedLocales: readonly string[];
  enableLegacyDefaultLocaleRedirect: boolean;
  languageSwitcherTranslationKeys: Readonly<Record<string, string>>;
};

const DEFAULT_LANGUAGE_LABEL_KEYS: Readonly<Record<string, string>> = {
  ro: 'common.languageRo',
  ru: 'common.languageRu',
  en: 'common.languageEn',
  sq: 'common.languageSq',
};

const MOLDOVA_DEFAULT: ResolvedLocaleRouting = {
  defaultLocale: 'ro',
  supportedLocales: ['ro', 'ru', 'en'],
  prefixedLocales: ['ru', 'en'],
  enableLegacyDefaultLocaleRedirect: true,
  languageSwitcherTranslationKeys: { ...DEFAULT_LANGUAGE_LABEL_KEYS },
};

function normalizeLocaleSegment(raw: string): string {
  return String(raw)
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

function isValidLocaleSegment(seg: string): boolean {
  return Boolean(seg) && /^[a-z0-9-]{1,15}$/i.test(seg);
}

function dedupeLowerPreserveOrder(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const seg = normalizeLocaleSegment(raw);
    if (!isValidLocaleSegment(seg) || seen.has(seg)) continue;
    seen.add(seg);
    out.push(seg);
  }
  return out;
}

function sortPrefixedLongestFirst(segments: readonly string[]): string[] {
  const uniq = dedupeLowerPreserveOrder(segments);
  return [...uniq].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

function buildLanguageSwitcherTranslationKeys(
  supported: readonly string[],
  raw?: LocaleRoutingConfig,
): Record<string, string> {
  const custom = raw?.languageSwitcherTranslationKeys ?? {};
  const out: Record<string, string> = {};
  for (const loc of supported) {
    const low = loc.toLowerCase();
    const key = custom[low];
    out[low] =
      typeof key === 'string' && key.length > 0
        ? key
        : (DEFAULT_LANGUAGE_LABEL_KEYS[low] ?? 'common.languageLocaleCode');
  }
  return out;
}

function resolveLegacyDefaultLocaleRedirect(raw?: LocaleRoutingConfig): boolean {
  if (!raw) {
    return MOLDOVA_DEFAULT.enableLegacyDefaultLocaleRedirect;
  }
  return (
    raw.enableLegacyDefaultLocaleRedirect ??
    raw.enableLegacyRoPathRedirect ??
    MOLDOVA_DEFAULT.enableLegacyDefaultLocaleRedirect
  );
}

export function resolveLocaleRouting(site: SiteConfig): ResolvedLocaleRouting {
  const raw = site.localeRouting;
  if (!raw) {
    return MOLDOVA_DEFAULT;
  }

  const defaultLocale = normalizeLocaleSegment(
    String(raw.defaultLocale || site.locale.split('-')[0] || 'ro'),
  );
  if (!isValidLocaleSegment(defaultLocale)) {
    return MOLDOVA_DEFAULT;
  }

  const supportedSource =
    raw.supportedLocales?.length && raw.supportedLocales.length > 0
      ? raw.supportedLocales
      : [defaultLocale];
  const supported = dedupeLowerPreserveOrder(supportedSource);
  if (!supported.length || !supported.includes(defaultLocale)) {
    return MOLDOVA_DEFAULT;
  }

  const prefixedCandidates = (raw.prefixedLocales ?? []).map((p) =>
    normalizeLocaleSegment(String(p)),
  );
  const prefixedFiltered = prefixedCandidates.filter(
    (p) => isValidLocaleSegment(p) && supported.includes(p),
  );
  const prefixed = sortPrefixedLongestFirst(prefixedFiltered);

  for (const p of prefixed) {
    if (p === defaultLocale) {
      return MOLDOVA_DEFAULT;
    }
  }

  return {
    defaultLocale,
    supportedLocales: supported,
    prefixedLocales: prefixed,
    enableLegacyDefaultLocaleRedirect: resolveLegacyDefaultLocaleRedirect(raw),
    languageSwitcherTranslationKeys: buildLanguageSwitcherTranslationKeys(supported, raw),
  };
}

export function isLocaleRoutingEnabled(cfg: LocaleRoutingConfig | undefined): boolean {
  if (!cfg?.supportedLocales?.length) return false;
  return dedupeLowerPreserveOrder(cfg.supportedLocales).length > 1;
}

export function isLanguageSwitcherEnabledEnv(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER === 'true';
}

export function shouldShowLanguageSwitcher(site: SiteConfig): boolean {
  return isLanguageSwitcherEnabledEnv() && resolveLocaleRouting(site).supportedLocales.length > 1;
}
