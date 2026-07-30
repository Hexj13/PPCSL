export function getCountry(): string {
  return process.env.COUNTRY || process.env.NEXT_PUBLIC_COUNTRY || 'md';
}

export function isWeeklyViewsDigestEnabled(): boolean {
  return process.env.WEEKLY_VIEWS_DIGEST_ENABLED === 'true';
}
