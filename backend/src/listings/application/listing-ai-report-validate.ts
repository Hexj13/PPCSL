import type {
  AiListingQualityScore,
  AiListingQualityScoreCriterionKey,
  AiListingQualityScoreItems,
  AiListingScoreItem,
  AiListingVehicleScore,
  AiListingVehicleScoreCriterionKey,
  AiListingVehicleScoreItems,
  AiListingReportPayload,
  AiReportLanguage,
} from './listing-ai-report.types';

const QUALITY_SCORE_CRITERIA: AiListingQualityScoreCriterionKey[] = [
  'dataCompleteness',
  'mediaQuality',
  'descriptionQuality',
  'priceAdequacy',
  'safeChoice',
];

const VEHICLE_SCORE_CRITERIA: AiListingVehicleScoreCriterionKey[] = [
  'mileage',
  'equipment',
  'reliability',
  'liquidity',
  'popularity',
];

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

const QUALITY_SUMMARY_MIN_LEN = 20;
const QUALITY_SUMMARY_MAX_LEN = 600;
const QUALITY_ITEM_SUMMARY_MIN_LEN = 10;
const QUALITY_ITEM_SUMMARY_MAX_LEN = 400;

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

function clampScore(v: unknown): number | null {
  if (typeof v !== 'number' || Number.isNaN(v)) {
    return null;
  }
  return Math.min(100, Math.max(0, Math.round(v)));
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

function normalizeQualitySummary(v: unknown): string | null {
  if (!isNonEmptyString(v)) {
    return null;
  }
  const t = v.trim();
  if (t.length < QUALITY_SUMMARY_MIN_LEN || t.length > QUALITY_SUMMARY_MAX_LEN) {
    return null;
  }
  return t;
}

const QUALITY_CRITERION_LABELS: Record<
  AiReportLanguage,
  Partial<Record<AiListingQualityScoreCriterionKey, string>>
> = {
  ru: {
    dataCompleteness: 'Полнота данных',
    safeChoice: 'Безопасный выбор',
  },
  ro: {
    dataCompleteness: 'Completitudinea datelor',
    safeChoice: 'Alegere sigură',
  },
};

const SAFE_CHOICE_WORDING_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bhigh risk\b/gi, 'grounds for extra caution'],
  [/\blow risk\b/gi, 'safer choice based on listing data'],
  [/\brisky\b/gi, 'requiring extra caution'],
  [/\bunsafe\b/gi, 'requiring extra caution'],
  [/\bdanger(?:ous)?\b/gi, 'concern'],
  [/\bвысок(?:ий|ого|ому|им|ом)?\s+риск\b/giu, 'повод для дополнительной осторожности'],
  [/\bнизк(?:ий|ого|ому|им|ом)?\s+риск\b/giu, 'более безопасный выбор по данным объявления'],
  [/\bриски\b/giu, 'поводы для осторожности'],
  [/\bриск\b/giu, 'повод для осторожности'],
  [/\bопасн(?:о|ый|ая|ое|ые|ого|ому|ым)?\b/giu, 'требует осторожности'],
  [/\brisc (?:mare|înalt|ridicat)\b/giu, 'motiv de prudență suplimentară'],
  [/\brisc (?:mic|scăzut)\b/giu, 'alegere mai sigură pe baza datelor anunțului'],
  [/\brisc(?:uri|ul)?\b/giu, 'motiv de prudență'],
];

function softenSafeChoiceWording(text: string): string {
  let result = text;
  for (const [pattern, replacement] of SAFE_CHOICE_WORDING_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function normalizeSafeChoiceItem(item: AiListingScoreItem): AiListingScoreItem {
  return {
    ...item,
    summary: softenSafeChoiceWording(item.summary),
  };
}

export function applyQualityScorePresentation(
  qualityScore: AiListingQualityScore,
  reportLanguage: AiReportLanguage,
): AiListingQualityScore {
  const labels = QUALITY_CRITERION_LABELS[reportLanguage];
  const dataCompletenessLabel =
    labels.dataCompleteness ?? qualityScore.items.dataCompleteness.label;
  const safeChoiceLabel = labels.safeChoice ?? qualityScore.items.safeChoice.label;

  return {
    ...qualityScore,
    items: {
      ...qualityScore.items,
      dataCompleteness: {
        ...qualityScore.items.dataCompleteness,
        label: dataCompletenessLabel,
      },
      safeChoice: normalizeSafeChoiceItem({
        ...qualityScore.items.safeChoice,
        label: safeChoiceLabel,
      }),
    },
  };
}

function normalizeScoreItem(v: unknown): AiListingScoreItem | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    return null;
  }
  const o = v as Record<string, unknown>;
  const score = clampScore(o.score);
  if (score == null || !isNonEmptyString(o.label)) {
    return null;
  }
  const summaryRaw = o.summary;
  if (!isNonEmptyString(summaryRaw)) {
    return null;
  }
  const summary = summaryRaw.trim();
  if (
    summary.length < QUALITY_ITEM_SUMMARY_MIN_LEN ||
    summary.length > QUALITY_ITEM_SUMMARY_MAX_LEN
  ) {
    return null;
  }
  return {
    label: o.label.trim(),
    score,
    summary,
  };
}

function normalizeQualityScore(v: unknown): AiListingQualityScore | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    return null;
  }
  const o = v as Record<string, unknown>;
  const summary = normalizeQualitySummary(o.summary);
  if (!summary) {
    return null;
  }
  if (!o.items || typeof o.items !== 'object' || Array.isArray(o.items)) {
    return null;
  }
  const itemsRaw = o.items as Record<string, unknown>;
  const items = {} as Partial<AiListingQualityScoreItems>;
  const scores: number[] = [];

  for (const key of QUALITY_SCORE_CRITERIA) {
    const item = normalizeScoreItem(itemsRaw[key]);
    if (!item) {
      return null;
    }
    items[key] = item;
    scores.push(item.score);
  }

  const computedOverall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const overallScore = clampScore(o.overallScore);
  const normalizedOverall =
    overallScore != null && Math.abs(overallScore - computedOverall) <= 2
      ? overallScore
      : computedOverall;

  return {
    overallScore: normalizedOverall,
    summary,
    items: items as AiListingQualityScoreItems,
  };
}

function normalizeVehicleScore(v: unknown): AiListingVehicleScore | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    return null;
  }
  const o = v as Record<string, unknown>;
  const summary = normalizeQualitySummary(o.summary);
  if (!summary) {
    return null;
  }
  if (!o.items || typeof o.items !== 'object' || Array.isArray(o.items)) {
    return null;
  }
  const itemsRaw = o.items as Record<string, unknown>;
  const items = {} as Partial<AiListingVehicleScoreItems>;
  const scores: number[] = [];

  for (const key of VEHICLE_SCORE_CRITERIA) {
    const item = normalizeScoreItem(itemsRaw[key]);
    if (!item) {
      return null;
    }
    items[key] = item;
    scores.push(item.score);
  }

  const computedOverall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const overallScore = clampScore(o.overallScore);
  const normalizedOverall =
    overallScore != null && Math.abs(overallScore - computedOverall) <= 2
      ? overallScore
      : computedOverall;

  return {
    overallScore: normalizedOverall,
    summary,
    items: items as AiListingVehicleScoreItems,
  };
}

export function parseAndValidateAiListingReportPayload(
  raw: unknown,
): AiListingReportPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const summary = normalizeSummaryString(o.summary);
  if (!summary) return null;

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

  // _scratchpad is ignored and not included in the final payload

  const qualityScore = normalizeQualityScore(o.qualityScore) ?? undefined;
  const vehicleScore = normalizeVehicleScore(o.vehicleScore) ?? undefined;

  return {
    modelContext: o.modelContext.map((s: string) => s.trim()),
    summary,
    strengths: o.strengths.map((s: string) => s.trim()),
    weaknesses: o.weaknesses.map((s: string) => s.trim()),
    buyingChecks: o.buyingChecks.map((s: string) => s.trim()),
    questionsForSeller: o.questionsForSeller.map((s: string) => s.trim()),
    redFlags: redFlagsRaw.map((s: string) => String(s).trim()),
    confidence,
    disclaimer: '',
    ...(qualityScore ? { qualityScore } : {}),
    ...(vehicleScore ? { vehicleScore } : {}),
  };
}

export function hasRawQualityScore(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  return 'qualityScore' in (raw as Record<string, unknown>);
}
