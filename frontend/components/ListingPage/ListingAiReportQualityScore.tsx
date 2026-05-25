'use client';

import type {
  ListingAiQualityScore,
  ListingAiVehicleScore,
  ListingAiQualityScoreCriterionKey,
  ListingAiVehicleScoreCriterionKey,
} from '@/lib/api';

import {
  QUALITY_CRITERION_ORDER,
  VEHICLE_CRITERION_ORDER,
  ListingAiReportRadarChart,
} from './ListingAiReportRadarChart';
import {
  getQualityCriterionLabel,
  getVehicleCriterionLabel,
} from './listing-ai-report-quality-labels';

const CRITERIA_LIST_CLASS =
  'list-disc list-outside pl-8 space-y-2 text-base leading-relaxed text-text-secondary';

export function QualityScoreValue({
  score,
  t,
  size = 'large',
  bold = false,
}: {
  score: number;
  t: (k: string, p?: Record<string, string | number>) => string;
  size?: 'large' | 'inline';
  bold?: boolean;
}) {
  const weightClass = size === 'large' || bold ? 'font-bold' : 'font-semibold';
  const sizeClass = size === 'large' ? 'text-2xl' : 'text-base';

  return (
    <span className={`${sizeClass} ${weightClass} text-text-secondary`}>
      <span className={`text-primary-700 ${weightClass}`}>{score}</span>
      {t('listingDetail.aiReportQualityScoreSuffix')}
    </span>
  );
}

export interface ListingAiReportQualityOverviewProps {
  qualityScore: ListingAiQualityScore;
  t: (k: string, p?: Record<string, string | number>) => string;
}

export function ListingAiReportQualityOverview({
  qualityScore,
  t,
}: ListingAiReportQualityOverviewProps) {
  return (
    <div className="mb-4">
      <ListingAiReportRadarChart
        items={qualityScore.items}
        criterionOrder={QUALITY_CRITERION_ORDER}
        chartLabel={t('listingDetail.aiReportQualityChartLabel')}
        labelForCriterion={(key, fallbackLabel) =>
          getQualityCriterionLabel(key as ListingAiQualityScoreCriterionKey, fallbackLabel, t)
        }
      />
    </div>
  );
}

export interface ListingAiReportVehicleOverviewProps {
  vehicleScore: ListingAiVehicleScore;
  t: (k: string, p?: Record<string, string | number>) => string;
}

export function ListingAiReportVehicleOverview({
  vehicleScore,
  t,
}: ListingAiReportVehicleOverviewProps) {
  return (
    <div className="mb-4">
      <ListingAiReportRadarChart
        items={vehicleScore.items}
        criterionOrder={VEHICLE_CRITERION_ORDER}
        chartLabel={t('listingDetail.aiReportSectionVehicleCharacteristics')}
        labelForCriterion={(key, fallbackLabel) =>
          getVehicleCriterionLabel(key as ListingAiVehicleScoreCriterionKey, fallbackLabel, t)
        }
      />
    </div>
  );
}

export interface ListingAiReportVehicleCriteriaProps {
  vehicleScore: ListingAiVehicleScore;
  t: (k: string, p?: Record<string, string | number>) => string;
}

export function ListingAiReportVehicleCriteria({
  vehicleScore,
  t,
}: ListingAiReportVehicleCriteriaProps) {
  return (
    <ul className={`${CRITERIA_LIST_CLASS} mb-6`}>
      {VEHICLE_CRITERION_ORDER.map((key) => {
        const item = vehicleScore.items[key];
        if (item == null || typeof item.score !== 'number') {
          return null;
        }
        return (
          <li key={key}>
            <span className="font-semibold text-primary-900">
              {getVehicleCriterionLabel(key, item.label, t)}
            </span>
            <span className="text-text-secondary"> (</span>
            <QualityScoreValue score={item.score} t={t} size="inline" />
            <span className="text-text-secondary">
              {t('listingDetail.aiReportQualityScoreAfterLabel')}
            </span>
            {item.summary}
          </li>
        );
      })}
    </ul>
  );
}
export interface ListingAiReportQualityCriteriaProps {
  qualityScore: ListingAiQualityScore;
  t: (k: string, p?: Record<string, string | number>) => string;
}

export function ListingAiReportQualityCriteria({
  qualityScore,
  t,
}: ListingAiReportQualityCriteriaProps) {
  return (
    <ul className={`${CRITERIA_LIST_CLASS} mb-6`}>
      {QUALITY_CRITERION_ORDER.map((key) => {
        const item = qualityScore.items[key];
        if (item == null || typeof item.score !== 'number') {
          return null;
        }
        return (
          <li key={key}>
            <span className="font-semibold text-primary-900">
              {getQualityCriterionLabel(key, item.label, t)}
            </span>
            <span className="text-text-secondary"> (</span>
            <QualityScoreValue score={item.score} t={t} size="inline" />
            <span className="text-text-secondary">
              {t('listingDetail.aiReportQualityScoreAfterLabel')}
            </span>
            {item.summary}
          </li>
        );
      })}
    </ul>
  );
}
