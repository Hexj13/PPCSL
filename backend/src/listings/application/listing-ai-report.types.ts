export type AiReportLanguage = 'ru' | 'ro';

export type AiListingReportApiStatus = 'ready' | 'pending' | 'unavailable' | 'rate_limited';

export interface AiListingReportListingAnalysis {
  priceComment: string;
  mileageComment: string;
  descriptionComment: string;
  registrationComment?: string;
  optionsComment?: string;
}

export interface AiListingReportPayload {
  modelContext: string[];
  summary: string;
  listingAnalysis: AiListingReportListingAnalysis;
  strengths: string[];
  weaknesses: string[];
  buyingChecks: string[];
  questionsForSeller: string[];
  redFlags: string[];
  confidence: number;
  disclaimer: string;
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
