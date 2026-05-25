import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ListingAiInputSnapshot } from '../application/listing-ai-report-snapshot';
import type { AiReportLanguage } from '../application/listing-ai-report.types';

const DEFAULT_GEMINI_PRIMARY_MODEL = 'gemini-3.5-flash';
const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const AI_PROMPT_OMITTED_SNAPSHOT_FIELDS = [
  'listingId',
  'reportSchemaVersion',
  'category',
  'status',
  'last_updated_at',
] as const;

export type GeminiListingAiReportJsonResult = {
  text: string | null;
  geminiModel: string | null;
  lastInvokedGeminiModel: string | null;
};

function shouldAttemptFallbackModel(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/\[\s*(404|429|500|502|503|504)\s/i.test(msg)) {
    return true;
  }
  const l = msg.toLowerCase();
  return (
    l.includes('no longer available') ||
    l.includes('not found') ||
    l.includes('service unavailable') ||
    l.includes('high demand') ||
    l.includes('overloaded') ||
    l.includes('resource exhausted') ||
    l.includes('econnreset') ||
    l.includes('etimedout') ||
    l.includes('eai_again')
  );
}

const LIST_THREE_TO_SIX = {
  type: SchemaType.ARRAY,
  items: { type: SchemaType.STRING },
  minItems: 3,
  maxItems: 6,
} as const;

const LIST_TWO_TO_FIVE = {
  type: SchemaType.ARRAY,
  items: { type: SchemaType.STRING },
  minItems: 2,
  maxItems: 5,
} as const;

const scoreItemSchema: Record<string, unknown> = {
  type: SchemaType.OBJECT,
  required: ['label', 'score', 'summary'],
  properties: {
    label: { type: SchemaType.STRING },
    score: { type: SchemaType.NUMBER },
    summary: { type: SchemaType.STRING },
  },
};

const qualityScoreObjectSchema: Record<string, unknown> = {
  type: SchemaType.OBJECT,
  required: ['overallScore', 'summary', 'items'],
  properties: {
    overallScore: { type: SchemaType.NUMBER },
    summary: { type: SchemaType.STRING },
    items: {
      type: SchemaType.OBJECT,
      required: [
        'dataCompleteness',
        'mediaQuality',
        'descriptionQuality',
        'priceAdequacy',
        'safeChoice',
      ],
      properties: {
        dataCompleteness: scoreItemSchema,
        mediaQuality: scoreItemSchema,
        descriptionQuality: scoreItemSchema,
        priceAdequacy: scoreItemSchema,
        safeChoice: scoreItemSchema,
      },
    },
  },
};

const vehicleScoreObjectSchema: Record<string, unknown> = {
  type: SchemaType.OBJECT,
  required: ['overallScore', 'summary', 'items'],
  properties: {
    overallScore: { type: SchemaType.NUMBER },
    summary: { type: SchemaType.STRING },
    items: {
      type: SchemaType.OBJECT,
      required: ['mileage', 'equipment', 'reliability', 'liquidity', 'popularity'],
      properties: {
        mileage: scoreItemSchema,
        equipment: scoreItemSchema,
        reliability: scoreItemSchema,
        liquidity: scoreItemSchema,
        popularity: scoreItemSchema,
      },
    },
  },
};

const REPORT_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  required: [
    '_scratchpad',
    'modelContext',
    'summary',
    'strengths',
    'weaknesses',
    'buyingChecks',
    'questionsForSeller',
    'redFlags',
    'confidence',
    'qualityScore',
    'vehicleScore',
  ],
  properties: {
    _scratchpad: { type: SchemaType.STRING },
    modelContext: { ...LIST_TWO_TO_FIVE },
    summary: { type: SchemaType.STRING },
    strengths: { ...LIST_THREE_TO_SIX },
    weaknesses: { ...LIST_THREE_TO_SIX },
    buyingChecks: { ...LIST_THREE_TO_SIX },
    questionsForSeller: { ...LIST_THREE_TO_SIX },
    redFlags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      minItems: 0,
      maxItems: 6,
    },
    confidence: { type: SchemaType.NUMBER },
    qualityScore: qualityScoreObjectSchema as never,
    vehicleScore: vehicleScoreObjectSchema as never,
  },
} as ResponseSchema;

function buildSystemInstruction(reportLanguage: AiReportLanguage): string {
  return [
    '# Role',
    'You are an expert vehicle evaluator analyzing car marketplace listings. Your goal is to provide a structured, objective, and highly factual AI report.',
    '',
    '# Core Guidelines',
    `- **Language:** All user-visible text fields in the JSON report MUST be in language: ${reportLanguage}. Supported languages: ru, ro.`,
    '- **Format:** Return ONLY valid JSON matching the provided schema. No markdown, no extra text.',
    '- **Tone:** Short, factual, dry, business-like, neutral. No fluff, hype, or emotional wording.',
    '- **No Advice:** Do NOT recommend buying or avoiding the car. Do not use purchase imperatives ("buy", "take it", "best deal", "avoid").',
    '- **Cautious Wording:** Use phrases like "may indicate", "requires verification", "data is insufficient", "looks consistent based on listing data".',
    '- **No Hallucinations:** Do NOT invent facts absent from the input JSON. Do NOT make categorical technical conclusions about the real condition of the vehicle.',
    '- **No Inferences from Absence:** Do not claim defects, accidents, service history, or legal status unless explicitly present. If data is sparse, lower confidence and state uncertainty clearly.',
    '- **No Image Analysis:** The input has NO image analysis. Do NOT mention missing photos, photo quality, stock photos, or anything photo-related in text fields (except for `mediaQuality` score).',
    '- **No External Data:** The input has NO external VIN/history check. Do not infer history issues from absence of data.',
    '',
    '# Output Structure Rules',
    '- **_scratchpad:** Use this field FIRST to write down your step-by-step reasoning, analyze the data, and plan your scores. This helps you produce better final JSON.',
    '- **modelContext:** Exactly 2–5 items. Well-known general features/pros/cons of this model/generation. Do NOT repeat listing-specific strengths/weaknesses. Ground in widely known facts.',
    '- **summary:** A single string of 2–4 short sentences synthesizing the main takeaways.',
    '- **strengths / weaknesses / buyingChecks / questionsForSeller:** 3–6 items each. Practical, buyer-relevant inferences. Order items from most important to least important.',
    '- **redFlags:** 0–6 items. Include ONLY material concerns grounded in the input. Use an empty array if none exist.',
    '- **confidence:** A float (0.0 to 1.0) reflecting listing completeness, data consistency, and uncertainty.',
    '',
    '# Quality Score Definitions',
    'Evaluate listing quality on a 0–100 scale. 0–39 weak, 40–69 average, 70–84 good, 85–100 excellent.',
    '- **overallScore:** Arithmetic mean of all five criterion scores, rounded to the nearest integer.',
    '- **dataCompleteness:** Measures DATA COMPLETENESS ONLY. Use `data_completeness.score_hint` as the main anchor. Explain `important_missing_fields`. Do NOT judge writing style or seller trust here. Label MUST be exactly "Полнота данных" (ru) or "Completitudinea datelor" (ro).',
    '- **mediaQuality:** Quantity of photos (`images_count`) and presence of video (`has_video`). Do NOT claim visual quality or angles, just sufficiency of media count.',
    '- **descriptionQuality:** Informativeness, specificity, and usefulness of the description text about condition/service/equipment.',
    '- **priceAdequacy:** Price plausibility vs year/mileage/model from input ONLY. You do NOT have live market data. If price looks generally plausible for the specs, score high and state it looks adequate. Do NOT imply a real market comparison.',
    '- **safeChoice:** Measures trustworthiness and internal consistency for a cautious buyer. Use consistency between title/description/specs/price, and absence of suspicious gaps. Score 100 = safer choice to explore further; Score 0 = many gaps warrant extra caution. Label MUST be exactly "Безопасный выбор" (ru) or "Alegere sigură" (ro). Do NOT use words like "risk", "риск", "danger", "опасно", "unsafe", or "risky".',
    '- **Separation:** `dataCompleteness` and `safeChoice` must NOT overlap. One is just missing fields, the other is trustworthiness of present data.',
    '',
    '# Vehicle Score Definitions',
    'Evaluate the vehicle characteristics on a 0–100 scale. 0–39 weak, 40–69 average, 70–84 good, 85–100 excellent.',
    '- **overallScore:** Arithmetic mean of all five criterion scores, rounded to the nearest integer.',
    '- **mileage:** Evaluate mileage vs year. Lower relative mileage = higher score. Label MUST be exactly "Пробег" (ru) or "Parcurs" (ro).',
    '- **equipment:** Evaluate richness of options/equipment. More options = higher score. Label MUST be exactly "Комплектация авто" (ru) or "Echipare" (ro).',
    '- **reliability:** General model reliability based on widely known facts about this generation/engine. Label MUST be exactly "Надёжность модели" (ru) or "Fiabilitatea modelului" (ro).',
    '- **liquidity:** Ease of resale / market liquidity for this model. Label MUST be exactly "Ликвидность" (ru) or "Lichiditate" (ro).',
    '- **popularity:** Market demand and popularity in the region. Label MUST be exactly "Популярность на рынке" (ru) or "Popularitate pe piață" (ro).',
  ].join('\n');
}

function buildUserPrompt(snapshot: ListingAiInputSnapshot): string {
  const cleanSnapshot: Record<string, unknown> = { ...snapshot };
  for (const field of AI_PROMPT_OMITTED_SNAPSHOT_FIELDS) {
    delete cleanSnapshot[field];
  }

  return [
    'Input listing JSON — use only these facts for the entire report:',
    JSON.stringify(cleanSnapshot, null, 2),
  ].join('\n');
}

@Injectable()
export class GeminiListingAiReportClient {
  private readonly logger = new Logger(GeminiListingAiReportClient.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    const key = this.configService.get<string>('GEMINI_API_KEY');
    return typeof key === 'string' && key.trim().length > 0;
  }

  private getGenerativeModel(
    genAI: GoogleGenerativeAI,
    modelName: string,
    reportLanguage: AiReportLanguage,
  ) {
    return genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: REPORT_SCHEMA,
        temperature: 0.35,
        maxOutputTokens: 6144,
      },
      systemInstruction: buildSystemInstruction(reportLanguage),
    });
  }

  private async generateContentOnce(
    genAI: GoogleGenerativeAI,
    modelName: string,
    snapshot: ListingAiInputSnapshot,
    reportLanguage: AiReportLanguage,
  ): Promise<string> {
    const model = this.getGenerativeModel(genAI, modelName, reportLanguage);
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(snapshot) }] }],
    });
    return result.response.text()?.trim() ?? '';
  }

  private captureGeminiFailure(err: unknown, extra: Record<string, string>): void {
    const error = err instanceof Error ? err : new Error(String(err));
    void import('@sentry/node').then((Sentry) => {
      Sentry.captureException(error, {
        tags: { source: 'gemini_listing_ai_report', ...extra },
      });
    });
  }

  async generateReportJson(
    snapshot: ListingAiInputSnapshot,
    reportLanguage: AiReportLanguage,
  ): Promise<GeminiListingAiReportJsonResult> {
    const nullResult = (
      lastInvokedGeminiModel: string | null = null,
    ): GeminiListingAiReportJsonResult => ({
      text: null,
      geminiModel: null,
      lastInvokedGeminiModel,
    });

    const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      return nullResult();
    }
    const primaryName =
      this.configService.get<string>('GEMINI_MODEL')?.trim() || DEFAULT_GEMINI_PRIMARY_MODEL;
    const fallbackName =
      this.configService.get<string>('GEMINI_MODEL_FALLBACK')?.trim() ||
      DEFAULT_GEMINI_FALLBACK_MODEL;
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
      const text = await this.generateContentOnce(genAI, primaryName, snapshot, reportLanguage);
      if (text) {
        return { text, geminiModel: primaryName, lastInvokedGeminiModel: primaryName };
      }
      return nullResult(primaryName);
    } catch (primaryErr) {
      const err = primaryErr instanceof Error ? primaryErr : new Error(String(primaryErr));
      this.logger.warn(
        `Gemini generateReportJson failed (primary ${primaryName}): ${err.message}${err.stack ? `\n${err.stack}` : ''}`,
        GeminiListingAiReportClient.name,
      );
      const useFallback = primaryName !== fallbackName && shouldAttemptFallbackModel(primaryErr);
      if (!useFallback) {
        this.captureGeminiFailure(primaryErr, { model_role: 'primary', model: primaryName });
        return nullResult(primaryName);
      }
      this.logger.warn(
        `Gemini primary model unavailable; retrying with fallback ${fallbackName}`,
        GeminiListingAiReportClient.name,
      );
      try {
        const text = await this.generateContentOnce(genAI, fallbackName, snapshot, reportLanguage);
        if (text) {
          return { text, geminiModel: fallbackName, lastInvokedGeminiModel: fallbackName };
        }
        return nullResult(fallbackName);
      } catch (fallbackErr) {
        const fe = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
        this.logger.warn(
          `Gemini generateReportJson failed (fallback ${fallbackName}): ${fe.message}${fe.stack ? `\n${fe.stack}` : ''}`,
          GeminiListingAiReportClient.name,
        );
        this.captureGeminiFailure(fallbackErr, {
          model_role: 'fallback',
          model: fallbackName,
          primary_model: primaryName,
        });
        return nullResult(fallbackName);
      }
    }
  }
}
