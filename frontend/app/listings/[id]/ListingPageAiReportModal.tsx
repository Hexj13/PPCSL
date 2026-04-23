'use client';

import type { ReactNode } from 'react';

import { Modal } from '@/components/modals/Modal';
import type { ListingAiReportListingAnalysis, ListingAiReportPayload } from '@/lib/api';
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

const ANALYSIS_KEYS: { k: keyof ListingAiReportListingAnalysis; i18n: string }[] = [
  { k: 'priceComment', i18n: 'listingDetail.aiReportAnalysisPrice' },
  { k: 'mileageComment', i18n: 'listingDetail.aiReportAnalysisMileage' },
  { k: 'descriptionComment', i18n: 'listingDetail.aiReportAnalysisDescription' },
  { k: 'registrationComment', i18n: 'listingDetail.aiReportAnalysisRegistration' },
  { k: 'optionsComment', i18n: 'listingDetail.aiReportAnalysisOptions' },
];

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
  if (isLegacyStringArrayList(report.listingAnalysis)) {
    (report.listingAnalysis as string[]).forEach((s) => lines.push(`- ${s}`));
  } else {
    const a = report.listingAnalysis as ListingAiReportListingAnalysis;
    for (const { k, i18n } of ANALYSIS_KEYS) {
      const text = a[k];
      if (typeof text === 'string' && text.trim().length > 0) {
        lines.push(`${t(i18n)}: ${text.trim()}`);
      }
    }
  }
  lines.push('');
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
const BODY_CLASS = 'leading-relaxed text-text-secondary';
const LIST_CLASS = 'list-disc list-outside pl-8 space-y-1';
const SUBHEAD_CLASS = 'font-semibold text-primary-800 text-base mb-1.5';

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8 last:mb-0">
      <h3 className={SECTION_TITLE_CLASS}>{title}</h3>
      <div className={BODY_CLASS}>{children}</div>
    </section>
  );
}

function ListingAnalysisBlock({
  analysis,
  t,
}: {
  analysis: ListingAiReportPayload['listingAnalysis'];
  t: (k: string) => string;
}) {
  if (isLegacyStringArrayList(analysis)) {
    return (
      <ul className={LIST_CLASS}>
        {analysis.map((item, i) => (
          <li key={`a-${i}-${item.slice(0, 48)}`}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-5">
      {ANALYSIS_KEYS.map(({ k, i18n }) => {
        const text = (analysis as ListingAiReportListingAnalysis)[k];
        if (typeof text !== 'string' || text.trim().length === 0) {
          return null;
        }
        return (
          <div key={k}>
            <p className={SUBHEAD_CLASS}>{t(i18n)}</p>
            <p className="whitespace-pre-wrap">{text.trim()}</p>
          </div>
        );
      })}
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
    >
      <div
        className={
          isReportLoading
            ? 'flex min-h-[min(52vh,480px)] flex-col items-center justify-center'
            : 'text-left'
        }
      >
        {isReportLoading && (
          <div className={`flex flex-col items-center gap-3 ${BODY_CLASS}`}>
            <Spinner inline size="md" className="opacity-80" />
            <p className="text-center max-w-xs">
              {phase === 'loading'
                ? t('listingDetail.aiReportLoading')
                : t('listingDetail.aiReportPending')}
            </p>
          </div>
        )}

        {(phase === 'unavailable' || phase === 'rate_limited') && (
          <div className="py-12 px-1 text-center space-y-3 max-w-md mx-auto">
            <p className="text-xl md:text-2xl font-bold text-primary-900">
              {t('listingDetail.aiReportUnavailableTitle')}
            </p>
            <p className={BODY_CLASS}>{message || t('listingDetail.aiReportUnavailableBody')}</p>
          </div>
        )}

        {phase === 'ready' && report && (
          <div className="listing-ai-report-content max-w-3xl mx-auto">
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
              <ListingAnalysisBlock analysis={report.listingAnalysis} t={t} />
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
