export function telegramHandleFromUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const fromQuery = parsed.searchParams.get('domain')?.replace(/^@/, '').trim();
    if (fromQuery) return `@${fromQuery}`;

    const fromPath = parsed.pathname.replace(/^\//, '').split('/')[0]?.replace(/^@/, '').trim();
    if (fromPath) return `@${fromPath}`;
  } catch {
    const fallback = trimmed.replace(/^@/, '');
    if (fallback) return `@${fallback}`;
  }

  return trimmed;
}
