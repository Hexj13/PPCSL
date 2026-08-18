export const EMAIL_LOCALES = ['en', 'ro', 'ru', 'sq'] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];

const EMAIL_LOCALE_SET = new Set<string>(EMAIL_LOCALES);

export function isEmailLocale(value: string): value is EmailLocale {
  return EMAIL_LOCALE_SET.has(value);
}

export function parseSupportedEmailLocales(raw?: string | null): EmailLocale[] | null {
  if (raw == null) {
    return null;
  }
  const locales = raw
    .split(/[,\s]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(isEmailLocale);
  return locales.length > 0 ? locales : null;
}

export type ResolveEmailLocaleOptions = {
  supportedLocales?: string | readonly string[] | null;
  defaultLocale?: string | null;
};

function supportedEmailLocalesFromOptions(options?: ResolveEmailLocaleOptions): EmailLocale[] {
  if (typeof options?.supportedLocales === 'string' || options?.supportedLocales == null) {
    const parsed = parseSupportedEmailLocales(
      typeof options?.supportedLocales === 'string' ? options.supportedLocales : null,
    );
    return parsed ?? [...EMAIL_LOCALES];
  }
  const locales = [...options.supportedLocales]
    .map((part) => part.trim().toLowerCase())
    .filter(isEmailLocale);
  return locales.length > 0 ? locales : [...EMAIL_LOCALES];
}

export function resolveEmailLocale(
  preferredLocale?: string | null,
  options?: ResolveEmailLocaleOptions,
): EmailLocale {
  const supported = supportedEmailLocalesFromOptions(options);
  const defaultRaw = options?.defaultLocale?.trim().toLowerCase();
  const fallback: EmailLocale =
    defaultRaw && supported.includes(defaultRaw as EmailLocale)
      ? (defaultRaw as EmailLocale)
      : supported.includes('en')
        ? 'en'
        : supported[0];

  const n = preferredLocale?.trim().toLowerCase();
  if (n && isEmailLocale(n) && supported.includes(n)) {
    return n;
  }
  return fallback;
}

export function localizedEmailPath(
  restPath: string,
  locale: string,
  defaultLocale: string,
): string {
  const qIdx = restPath.indexOf('?');
  const pathPart = qIdx >= 0 ? restPath.slice(0, qIdx) : restPath;
  const query = qIdx >= 0 ? restPath.slice(qIdx) : '';
  const normalized = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const loc = locale.trim().toLowerCase();
  const def = defaultLocale.trim().toLowerCase();
  if (!loc || loc === def) {
    return `${normalized}${query}`;
  }
  return `/${loc}${normalized}${query}`;
}

export function interpolateEmailTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{${key}}`).join(String(value));
  }
  return result;
}
