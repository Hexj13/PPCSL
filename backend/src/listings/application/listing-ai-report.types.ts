export type AiReportLanguage = 'ru' | 'ro' | 'en' | 'sq';

export const AI_LISTING_REPORT_SCHEMA_VERSION = 7;

export type AiListingQualityScoreCriterionKey =
  | 'dataCompleteness'
  | 'mediaQuality'
  | 'descriptionQuality'
  | 'priceAdequacy'
  | 'safeChoice';

export type AiListingVehicleScoreCriterionKey =
  | 'mileage'
  | 'equipment'
  | 'reliability'
  | 'liquidity'
  | 'popularity';

export interface AiListingScoreItem {
  label: string;
  score: number;
  summary: string;
}

export type AiListingQualityScoreItems = Record<
  AiListingQualityScoreCriterionKey,
  AiListingScoreItem
>;

export type AiListingVehicleScoreItems = Record<
  AiListingVehicleScoreCriterionKey,
  AiListingScoreItem
>;

export interface AiListingQualityScore {
  overallScore: number;
  summary: string;
  items: AiListingQualityScoreItems;
}

export interface AiListingVehicleScore {
  overallScore: number;
  summary: string;
  items: AiListingVehicleScoreItems;
}

export type AiListingReportApiStatus = 'ready' | 'pending' | 'unavailable' | 'rate_limited';

export interface AiListingReportPayload {
  modelContext: string[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
  buyingChecks: string[];
  questionsForSeller: string[];
  redFlags: string[];
  confidence: number;
  disclaimer: string;
  qualityScore?: AiListingQualityScore;
  vehicleScore?: AiListingVehicleScore;
}

export interface AiListingReportReadyResponse {
  status: 'ready';
  report: AiListingReportPayload;
}

export interface AiListingReportPendingResponse {
  status: 'pending';
}

export interface AiListingReportUnavailableResponse {
  status: 'unavailable';
  message: string;
}

export interface AiListingReportRateLimitedResponse {
  status: 'rate_limited';
  message: string;
}

export type AiListingReportPostResponse =
  | AiListingReportReadyResponse
  | AiListingReportPendingResponse
  | AiListingReportUnavailableResponse;
