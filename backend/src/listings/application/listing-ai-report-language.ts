import type { AiReportLanguage } from './listing-ai-report.types';

function normalizeLang(value: string | undefined): AiReportLanguage | null {
  if (!value) return null;
  const t = value.trim().toLowerCase();
  if (t === 'ru') return 'ru';
  if (t === 'ro') return 'ro';
  return null;
}

export function resolveAiReportLanguage(params: {
  headerReportLanguage?: string | null;
  acceptLanguage?: string | null;
  bodyLanguage?: string | null;
}): AiReportLanguage {
  const fromHeader = normalizeLang(params.headerReportLanguage ?? undefined);
  if (fromHeader) return fromHeader;

  const accept = params.acceptLanguage?.trim();
  if (accept) {
    const first = accept.split(',')[0]?.trim().split(';')[0]?.trim().toLowerCase();
    if (first?.startsWith('ru')) return 'ru';
    if (first?.startsWith('ro')) return 'ro';
  }

  const fromBody = normalizeLang(params.bodyLanguage ?? undefined);
  if (fromBody) return fromBody;

  return 'ro';
}
