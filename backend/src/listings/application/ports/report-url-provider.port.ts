export type ReportProviderLocale = 'ro' | 'ru';

export const REPORT_URL_PROVIDER = Symbol('REPORT_URL_PROVIDER');

export interface IReportUrlProvider {
  isEnabled(): boolean;
  generateUrl(vin: string, locale: ReportProviderLocale): Promise<string>;
  getFallbackUrl(locale: ReportProviderLocale): string;
}
