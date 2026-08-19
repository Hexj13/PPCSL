import type { AiReportLanguage } from './listing-ai-report.types';

const SUPPORTED: ReadonlySet<AiReportLanguage> = new Set(['ru', 'ro', 'en', 'sq']);

function normalizeLang(value: string | undefined): AiReportLanguage | null {
  if (!value) return null;
  const t = value.trim().toLowerCase();
  if (SUPPORTED.has(t as AiReportLanguage)) {
    return t as AiReportLanguage;
  }
  return null;
}

function fromAcceptLanguageTag(tag: string): AiReportLanguage | null {
  const low = tag.toLowerCase();
  if (low.startsWith('ru')) return 'ru';
  if (low.startsWith('ro')) return 'ro';
  if (low.startsWith('en')) return 'en';
  if (low.startsWith('sq')) return 'sq';
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
    const first = accept.split(',')[0]?.trim().split(';')[0]?.trim();
    if (first) {
      const fromAccept = fromAcceptLanguageTag(first);
      if (fromAccept) return fromAccept;
    }
  }

  const fromBody = normalizeLang(params.bodyLanguage ?? undefined);
  if (fromBody) return fromBody;

  // platform default when nothing is provided
  return 'ro';
}
