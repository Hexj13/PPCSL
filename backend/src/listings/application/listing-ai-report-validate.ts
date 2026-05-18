import type {
  AiListingReportListingAnalysis,
  AiListingReportPayload,
} from './listing-ai-report.types';

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isStringArray(v: unknown, minLen: number, maxLen: number): v is string[] {
  if (!Array.isArray(v)) return false;
  if (v.length < minLen || v.length > maxLen) return false;
  return v.every((x) => isNonEmptyString(x));
}

const SECTION_MIN = 3;
const SECTION_MAX = 6;
const MODEL_CONTEXT_MIN = 2;
const MODEL_CONTEXT_MAX = 5;

const SUMMARY_MIN_LEN = 40;
const SUMMARY_MAX_LEN = 4000;

function countSentences(text: string): number {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return 0;
  const byPunct = t
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (byPunct.length >= 2) {
    return byPunct.length;
  }
  const bySemi = t.split(/\s*;\s+/).filter((s) => s.trim().length > 0);
  if (bySemi.length >= 2) {
    return bySemi.length;
  }
  const byNl = t
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (byNl.length >= 2) {
    return byNl.length;
  }
  return byPunct.length > 0 ? 1 : 0;
}

function normalizeSummaryString(v: unknown): string | null {
  if (typeof v === 'string' && isNonEmptyString(v)) {
    const t = v.trim();
    if (t.length < SUMMARY_MIN_LEN || t.length > SUMMARY_MAX_LEN) {
      return null;
    }
    const n = countSentences(t);
    if (n < 2 || n > 4) {
      return null;
    }
    return t;
  }
  if (Array.isArray(v)) {
    const parts = v
      .filter((x): x is string => typeof x === 'string' && isNonEmptyString(x))
      .map((s) => s.trim());
    if (parts.length < 2) {
      return null;
    }
    const joined = parts.join(' ');
    if (joined.length < SUMMARY_MIN_LEN || joined.length > SUMMARY_MAX_LEN) {
      return null;
    }
    const n = countSentences(joined);
    if (n >= 2 && n <= 4) {
      return joined;
    }
    if (parts.length >= 2 && parts.length <= 4) {
      return joined;
    }
  }
  return null;
}

function normalizeListingAnalysis(v: unknown): AiListingReportListingAnalysis | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    return null;
  }
  const o = v as Record<string, unknown>;
  if (
    !isNonEmptyString(o.priceComment) ||
    !isNonEmptyString(o.mileageComment) ||
    !isNonEmptyString(o.descriptionComment)
  ) {
    return null;
  }
  if (o.registrationComment != null && typeof o.registrationComment !== 'string') {
    return null;
  }
  if (o.optionsComment != null && typeof o.optionsComment !== 'string') {
    return null;
  }
  const reg = o.registrationComment;
  const opt = o.optionsComment;
  return {
    priceComment: o.priceComment.trim(),
    mileageComment: o.mileageComment.trim(),
    descriptionComment: o.descriptionComment.trim(),
    registrationComment: typeof reg === 'string' && reg.trim() ? reg.trim() : undefined,
    optionsComment: typeof opt === 'string' && opt.trim() ? opt.trim() : undefined,
  };
}

export function parseAndValidateAiListingReportPayload(
  raw: unknown,
): AiListingReportPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const summary = normalizeSummaryString(o.summary);
  if (!summary) return null;

  const listingAnalysis = normalizeListingAnalysis(o.listingAnalysis);
  if (!listingAnalysis) return null;

  if (!isStringArray(o.modelContext, MODEL_CONTEXT_MIN, MODEL_CONTEXT_MAX)) {
    return null;
  }

  if (!isStringArray(o.strengths, SECTION_MIN, SECTION_MAX)) return null;
  if (!isStringArray(o.weaknesses, SECTION_MIN, SECTION_MAX)) return null;
  if (!isStringArray(o.buyingChecks, SECTION_MIN, SECTION_MAX)) return null;
  if (!isStringArray(o.questionsForSeller, SECTION_MIN, SECTION_MAX)) return null;

  const redFlagsRaw = o.redFlags;
  if (!Array.isArray(redFlagsRaw)) return null;
  if (redFlagsRaw.length > SECTION_MAX) return null;
  if (!redFlagsRaw.every((x) => isNonEmptyString(x))) return null;

  const conf = o.confidence;
  if (typeof conf !== 'number' || Number.isNaN(conf)) return null;
  const confidence = Math.min(1, Math.max(0, conf));

  return {
    modelContext: o.modelContext.map((s: string) => s.trim()),
    summary,
    listingAnalysis,
    strengths: o.strengths.map((s: string) => s.trim()),
    weaknesses: o.weaknesses.map((s: string) => s.trim()),
    buyingChecks: o.buyingChecks.map((s: string) => s.trim()),
    questionsForSeller: o.questionsForSeller.map((s: string) => s.trim()),
    redFlags: redFlagsRaw.map((s: string) => String(s).trim()),
    confidence,
    disclaimer: '',
  };
}
