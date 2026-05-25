import type {
  ListingAiQualityScoreCriterionKey,
  ListingAiVehicleScoreCriterionKey,
} from '@/lib/api';

const QUALITY_CRITERION_LABEL_I18N: Partial<Record<ListingAiQualityScoreCriterionKey, string>> = {
  dataCompleteness: 'listingDetail.aiReportQualityCriterionDataCompleteness',
  safeChoice: 'listingDetail.aiReportQualityCriterionSafeChoice',
};

const VEHICLE_CRITERION_LABEL_I18N: Partial<Record<ListingAiVehicleScoreCriterionKey, string>> = {
  mileage: 'listingDetail.aiReportVehicleCriterionMileage',
  equipment: 'listingDetail.aiReportVehicleCriterionEquipment',
  reliability: 'listingDetail.aiReportVehicleCriterionReliability',
  liquidity: 'listingDetail.aiReportVehicleCriterionLiquidity',
  popularity: 'listingDetail.aiReportVehicleCriterionPopularity',
};

export function getQualityCriterionLabel(
  key: ListingAiQualityScoreCriterionKey,
  fallbackLabel: string,
  t: (k: string) => string,
): string {
  const i18nKey = QUALITY_CRITERION_LABEL_I18N[key];
  return i18nKey ? t(i18nKey) : fallbackLabel;
}

export function getVehicleCriterionLabel(
  key: ListingAiVehicleScoreCriterionKey,
  fallbackLabel: string,
  t: (k: string) => string,
): string {
  const i18nKey = VEHICLE_CRITERION_LABEL_I18N[key];
  return i18nKey ? t(i18nKey) : fallbackLabel;
}
