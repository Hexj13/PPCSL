export const EMAIL_LOCALES = ['en', 'ro', 'ru', 'sq'] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];

export function resolveEmailLocale(preferredLocale?: string | null): EmailLocale {
  const n = preferredLocale?.trim().toLowerCase();
  if (n === 'ro' || n === 'ru' || n === 'en' || n === 'sq') {
    return n;
  }
  return 'en';
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
