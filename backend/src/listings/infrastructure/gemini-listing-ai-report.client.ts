import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ListingAiInputSnapshot } from '../application/listing-ai-report-snapshot';
import type { AiReportLanguage } from '../application/listing-ai-report.types';

const DEFAULT_GEMINI_PRIMARY_MODEL = 'gemini-3.1-flash-lite-preview';
const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-3-flash-preview';

export type GeminiListingAiReportJsonResult = {
  text: string | null;
  geminiModel: string | null;
  lastInvokedGeminiModel: string | null;
};

function shouldAttemptFallbackModel(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/\[\s*(429|500|502|503|504)\s/i.test(msg)) {
    return true;
  }
  const l = msg.toLowerCase();
  return (
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

const listingAnalysisObjectSchema: Record<string, unknown> = {
  type: SchemaType.OBJECT,
  required: ['priceComment', 'mileageComment', 'descriptionComment'],
  properties: {
    priceComment: { type: SchemaType.STRING },
    mileageComment: { type: SchemaType.STRING },
    descriptionComment: { type: SchemaType.STRING },
    registrationComment: { type: SchemaType.STRING },
    optionsComment: { type: SchemaType.STRING },
  },
};

const REPORT_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  required: [
    'modelContext',
    'summary',
    'listingAnalysis',
    'strengths',
    'weaknesses',
    'buyingChecks',
    'questionsForSeller',
    'redFlags',
    'confidence',
  ],
  properties: {
    modelContext: { ...LIST_TWO_TO_FIVE },
    summary: { type: SchemaType.STRING },
    listingAnalysis: listingAnalysisObjectSchema as never,
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
  },
} as ResponseSchema;

function buildSystemInstruction(reportLanguage: AiReportLanguage): string {
  return [
    'You analyze vehicle sale listings on a car marketplace.',
    `All user-visible text fields in the JSON report must be in language: ${reportLanguage}. Supported languages: ru, ro.`,

    'Return only valid JSON that matches the provided schema. No markdown, no extra text, no comments in any string field.',

    'Style: short, factual, dry, business-like, neutral. No fluff. No hype. No emotional wording.',
    'Do not recommend buying or avoiding the car. Do not use purchase imperatives or phrases like "buy", "take it", "recommended", "best deal", "great purchase", "avoid this car".',
    'Use cautious wording: "may indicate", "requires verification", "data is insufficient", "looks consistent based on listing data".',

    'Do not invent facts absent from the input JSON.',
    'Do not make categorical technical conclusions about the real condition of the vehicle.',
    'Do not claim defects, accidents, service history, ownership history, or legal status unless explicitly present in the input.',
    'If data is sparse or vague, lower confidence and state uncertainty clearly.',

    'The input has no image analysis. Do not mention missing photos, photo quality, stock photos, real-car photos, or anything photo-related.',
    'The input has no external VIN/history check unless explicitly provided. Do not infer VIN/history issues from absence of data.',

    'Use only structured and textual listing data: title, description, brand, model, year, mileage, price, currency, fuel, transmission, body type, drive type, equipment, registration type, seller type, location, and provided backend metrics.',

    'Consider registration type if provided: imported, local, or unknown. If unknown, treat it as uncertainty, not as a red flag by itself.',
    'Consider important equipment/options only when present in the input. Do not assume equipment that is not listed.',

    'modelContext must be exactly 2–5 list items (one array). It is the "about the model" section: well-known features of this model/generation/trim in general, not a repeat of this listing strengths/weaknesses. Aim for a rough balance: about half the bullets reflect typical pros or strong sides of the model, about half reflect typical cons, compromises, or caveats, without being a copy of strengths/weaknesses. Facts and practical implications only, no filler. You may add at most one distinctive fact if it is genuinely material for a purchase decision. Ground in widely known, general knowledge about the model/segment; do not invent listing-specific defects or service history. If brand/model in the input is too vague, stay generic and mark uncertainty in wording.',

    'summary must be 2–4 short sentences in one string. It should synthesize the main takeaways without repeating every raw field.',

    'listingAnalysis must contain concise comments in priceComment, mileageComment, and descriptionComment. Optionally add registrationComment and/or optionsComment when relevant. Each comment must add interpretation, not simply restate raw values. Omit optional fields or leave them as short empty string when not applicable.',

    'strengths: 3–6 items. Each item must be a practical, buyer-relevant inference grounded in the listing data or common model/segment context.',
    'weaknesses: 3–6 items. Each item must describe uncertainty, trade-off, missing data, or typical risk without exaggeration.',
    'buyingChecks: 3–6 items. Practical checks before inspection/purchase, phrased neutrally, not as commands to buy.',
    'questionsForSeller: 3–6 short questions. Ask only about relevant missing or important information.',
    'redFlags: 0–6 items. Include only material concerns grounded in the input. Do not force red flags if there are none. Use an empty array when appropriate.',

    'Within every list, order items by importance for a prospective buyer: most material first, except modelContext which follows the balanced pros/cons pattern above.',
    'No list may contain more than 6 items, except modelContext (max 5 items).',

    'confidence must reflect listing completeness, data consistency, description quality, and uncertainty.',
  ].join(' ');
}

function buildUserPrompt(snapshot: ListingAiInputSnapshot): string {
  return [
    'Input listing JSON — use only these facts for the entire report:',
    JSON.stringify(snapshot),
    '',
    'Reminder: photos are not included in this input. Do not output any point about missing or insufficient photographs.',
    'Reminder: redFlags may be empty or have 1–6 items; never exceed 6. Do not pad redFlags with invented risks.',
    'Reminder: inside each bullet list, order items from most important to least important (first item = highest priority for the reader).',
    'Reminder: modelContext is 2–5 short bullets, separate from strengths and weaknesses — model-level context, not this listing. The product UI presents modelContext as the first section after the title, before summary.',
    'Reminder: summary is a single string of 2–4 sentences, not an array.',
    'Reminder: listingAnalysis is an object with priceComment, mileageComment, descriptionComment, and optional registrationComment and optionsComment — not an array of strings.',
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
        maxOutputTokens: 4096,
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
