'use client';

import type { ReactNode } from 'react';

import {
  ListingAiReportQualityCriteria,
  ListingAiReportQualityOverview,
  ListingAiReportVehicleOverview,
  ListingAiReportVehicleCriteria,
  QualityScoreValue,
} from '@/components/ListingPage/ListingAiReportQualityScore';
import {
  getQualityCriterionLabel,
  getVehicleCriterionLabel,
} from '@/components/ListingPage/listing-ai-report-quality-labels';
import { Modal } from '@/components/modals/Modal';
import type {
  ListingAiReportPayload,
  ListingAiQualityScoreCriterionKey,
  ListingAiVehicleScoreCriterionKey,
} from '@/lib/api';
import { Spinner } from '@/ui';

export type ListingAiReportModalPhase =
  | 'idle'
  | 'loading'
  | 'pending'
  | 'ready'
  | 'unavailable'
  | 'rate_limited';

function isLegacyStringArrayList(value: unknown): value is string[] {
  if (typeof value === 'string') {
    return false;
  }
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((x) => typeof x === 'string' && x.trim().length > 0)
  );
}

function renderSummaryText(summary: string | string[] | undefined | null): string {
  if (summary == null) {
    return '';
  }
  if (typeof summary === 'string') {
    return summary.trim();
  }
  if (Array.isArray(summary)) {
    return Array.from(summary as readonly unknown[])
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0)
      .join('\n\n');
  }
  return String(summary).trim();
}

function getListingPageUrlForClipboard(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}

function buildPlainTextReport(
  report: ListingAiReportPayload,
  t: (k: string, p?: Record<string, string | number>) => string,
  listingPageUrl: string,
): string {
  const lines: string[] = [];
  const url = listingPageUrl.trim();
  if (url.length > 0) {
    lines.push(url);
    lines.push('');
  }
  lines.push(t('listingDetail.aiReportModalTitle'));
  lines.push('');
  lines.push(t('listingDetail.aiReportSectionModelContext'));
  report.modelContext.forEach((s) => lines.push(`- ${s}`));
  lines.push('');
  lines.push(t('listingDetail.aiReportSectionSummary'));
  lines.push(renderSummaryText(report.summary as string | string[]));
  lines.push('');
  lines.push(t('listingDetail.aiReportSectionAnalysis'));
  if (report.qualityScore) {
    lines.push(t('listingDetail.aiReportSectionQualityAssessment'));
    lines.push(`${report.qualityScore.overallScore}/100`);
    lines.push(report.qualityScore.summary);
    for (const key of [
      'dataCompleteness',
      'mediaQuality',
      'descriptionQuality',
      'priceAdequacy',
      'safeChoice',
    ] as const) {
      const item = report.qualityScore.items[key];
      if (item == null) continue;
      lines.push(
        `${getQualityCriterionLabel(key as ListingAiQualityScoreCriterionKey, item.label, t)} (${item.score}/100): ${item.summary}`,
      );
    }
    lines.push('');
  }
  if (report.vehicleScore) {
    lines.push(t('listingDetail.aiReportSectionVehicleCharacteristics'));
    lines.push(`${report.vehicleScore.overallScore}/100`);
    lines.push(report.vehicleScore.summary);
    for (const key of ['mileage', 'equipment', 'reliability', 'liquidity', 'popularity'] as const) {
      const item = report.vehicleScore.items[key];
      if (item == null) continue;
      lines.push(
        `${getVehicleCriterionLabel(key as ListingAiVehicleScoreCriterionKey, item.label, t)} (${item.score}/100): ${item.summary}`,
      );
    }
    lines.push('');
  }
  lines.push(t('listingDetail.aiReportSectionStrengths'));
  report.strengths.forEach((s) => lines.push(`- ${s}`));
  lines.push('');
  lines.push(t('listingDetail.aiReportSectionWeaknesses'));
  report.weaknesses.forEach((s) => lines.push(`- ${s}`));
  lines.push('');
  lines.push(t('listingDetail.aiReportSectionChecks'));
  report.buyingChecks.forEach((s) => lines.push(`- ${s}`));
  lines.push('');
  lines.push(t('listingDetail.aiReportSectionQuestions'));
  report.questionsForSeller.forEach((s) => lines.push(`- ${s}`));
  if (report.redFlags.length > 0) {
    lines.push('');
    lines.push(t('listingDetail.aiReportSectionRisks'));
    report.redFlags.forEach((s) => lines.push(`- ${s}`));
  }
  lines.push('');
  lines.push(t('listingDetail.aiReportProductDisclaimer'));
  return lines.join('\n');
}

const SECTION_TITLE_CLASS = 'text-xl md:text-2xl font-bold mb-4 text-primary-900';
const BODY_CLASS = 'text-base leading-relaxed text-text-secondary';
const LIST_CLASS =
  'list-disc list-outside pl-8 space-y-2 text-base leading-relaxed text-text-secondary';

const SUBSECTION_TITLE_CLASS = 'text-lg font-bold mb-3 text-primary-900';

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8 last:mb-0">
      <h3 className={SECTION_TITLE_CLASS}>{title}</h3>
      <div className={BODY_CLASS}>{children}</div>
    </section>
  );
}

function ReportSubSection({
  title,
  overallScore,
  t,
  children,
}: {
  title: string;
  overallScore?: number;
  t?: (k: string, p?: Record<string, string | number>) => string;
  children: ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <h4 className={SUBSECTION_TITLE_CLASS}>
        {title}
        {overallScore != null && t != null && (
          <>
            <span className="text-text-secondary"> (</span>
            <QualityScoreValue score={overallScore} t={t} size="inline" bold />
            <span className="text-text-secondary">)</span>
          </>
        )}
      </h4>
      {children}
    </div>
  );
}

export interface ListingPageAiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  phase: ListingAiReportModalPhase;
  report: ListingAiReportPayload | null;
  message: string | null;
  t: (k: string, p?: Record<string, string | number>) => string;
}

export function ListingPageAiReportModal({
  isOpen,
  onClose,
  phase,
  report,
  message,
  t,
}: ListingPageAiReportModalProps) {
  const handleCopy = async () => {
    if (!report) return;
    try {
      const listingPageUrl = getListingPageUrlForClipboard();
      await navigator.clipboard.writeText(buildPlainTextReport(report, t, listingPageUrl));
      const { toast } = await import('@/lib/toast');
      toast.success(t('listingDetail.aiReportCopied'));
    } catch {
      const { toast } = await import('@/lib/toast');
      toast.error(t('listingDetail.copyError'));
    }
  };

  const isReportLoading = phase === 'loading' || phase === 'pending';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('listingDetail.aiReportModalTitle')}
      size="large"
      dataTestId="listing-ai-report-modal"
    >
      <div
        className={
          isReportLoading
            ? 'flex min-h-[min(52vh,480px)] flex-col items-center justify-center'
            : 'text-left'
        }
      >
        {isReportLoading && (
          <div
            className={`flex flex-col items-center gap-3 ${BODY_CLASS}`}
            data-testid="listing-ai-report-loading"
          >
            <Spinner inline size="md" className="opacity-80" />
            <p className="text-center max-w-xs">
              {phase === 'loading'
                ? t('listingDetail.aiReportLoading')
                : t('listingDetail.aiReportPending')}
            </p>
          </div>
        )}

        {(phase === 'unavailable' || phase === 'rate_limited') && (
          <div
            className="py-12 px-1 text-center space-y-3 max-w-md mx-auto"
            data-testid="listing-ai-report-unavailable"
          >
            <p className="text-xl md:text-2xl font-bold text-primary-900">
              {t('listingDetail.aiReportUnavailableTitle')}
            </p>
            <p className={BODY_CLASS}>{message || t('listingDetail.aiReportUnavailableBody')}</p>
          </div>
        )}

        {phase === 'ready' && report && (
          <div
            className="listing-ai-report-content max-w-3xl mx-auto"
            data-testid="listing-ai-report-ready"
          >
            <ReportSection title={t('listingDetail.aiReportSectionModelContext')}>
              <ul className={LIST_CLASS}>
                {report.modelContext.map((item, i) => (
                  <li key={`mc-${i}-${item.slice(0, 48)}`}>{item}</li>
                ))}
              </ul>
            </ReportSection>

            <ReportSection title={t('listingDetail.aiReportSectionSummary')}>
              {isLegacyStringArrayList(report.summary) ? (
                <ul className={LIST_CLASS}>
                  {(report.summary as string[]).map((item, i) => (
                    <li key={`sum-${i}-${item.slice(0, 48)}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className={`${BODY_CLASS} whitespace-pre-line`}>
                  {renderSummaryText(report.summary as string | string[])}
                </p>
              )}
            </ReportSection>

            <ReportSection title={t('listingDetail.aiReportSectionAnalysis')}>
              {report.qualityScore && (
                <ReportSubSection
                  title={t('listingDetail.aiReportSectionQualityAssessment')}
                  overallScore={report.qualityScore.overallScore}
                  t={t}
                >
                  <ListingAiReportQualityOverview qualityScore={report.qualityScore} t={t} />
                  <p className={`${BODY_CLASS} mb-6 whitespace-pre-line`}>
                    {report.qualityScore.summary}
                  </p>
                  <ListingAiReportQualityCriteria qualityScore={report.qualityScore} t={t} />
                </ReportSubSection>
              )}
              {report.vehicleScore && (
                <ReportSubSection
                  title={t('listingDetail.aiReportSectionVehicleCharacteristics')}
                  overallScore={report.vehicleScore.overallScore}
                  t={t}
                >
                  <ListingAiReportVehicleOverview vehicleScore={report.vehicleScore} t={t} />
                  <p className={`${BODY_CLASS} mb-6 whitespace-pre-line`}>
                    {report.vehicleScore.summary}
                  </p>
                  <ListingAiReportVehicleCriteria vehicleScore={report.vehicleScore} t={t} />
                </ReportSubSection>
              )}
            </ReportSection>

            <ReportSection title={t('listingDetail.aiReportSectionStrengths')}>
              <ul className={LIST_CLASS}>
                {report.strengths.map((item, i) => (
                  <li key={`s-${i}-${item.slice(0, 48)}`}>{item}</li>
                ))}
              </ul>
            </ReportSection>

            <ReportSection title={t('listingDetail.aiReportSectionWeaknesses')}>
              <ul className={LIST_CLASS}>
                {report.weaknesses.map((item, i) => (
                  <li key={`w-${i}-${item.slice(0, 48)}`}>{item}</li>
                ))}
              </ul>
            </ReportSection>

            <ReportSection title={t('listingDetail.aiReportSectionChecks')}>
              <ul className={LIST_CLASS}>
                {report.buyingChecks.map((item, i) => (
                  <li key={`c-${i}-${item.slice(0, 48)}`}>{item}</li>
                ))}
              </ul>
            </ReportSection>

            <ReportSection title={t('listingDetail.aiReportSectionQuestions')}>
              <ul className={LIST_CLASS}>
                {report.questionsForSeller.map((item, i) => (
                  <li key={`q-${i}-${item.slice(0, 48)}`}>{item}</li>
                ))}
              </ul>
            </ReportSection>

            {report.redFlags.length > 0 && (
              <ReportSection title={t('listingDetail.aiReportSectionRisks')}>
                <ul className={LIST_CLASS}>
                  {report.redFlags.map((item, i) => (
                    <li key={`r-${i}-${item.slice(0, 48)}`}>{item}</li>
                  ))}
                </ul>
              </ReportSection>
            )}

            <footer className="mt-8">
              <div className="mb-8 flex w-full justify-center">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="w-full min-h-12 px-6 md:px-8 py-2 md:py-2.5 rounded-lg font-medium transition-all duration-200 text-primary-700 hover-only:hover:text-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none md:w-auto"
                >
                  {t('listingDetail.aiReportCopy')}
                </button>
              </div>
              <hr className="m-0 w-full border-0 border-t border-primary-700" />
              <p className="mt-8 text-xs leading-snug text-text-secondary">
                {t('listingDetail.aiReportProductDisclaimer')}
              </p>
            </footer>
          </div>
        )}
      </div>
    </Modal>
  );
}
