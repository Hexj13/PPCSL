'use client';

import { Modal } from '@/components/modals/Modal';

import { ParsingSearchableTextPanel } from './ParsingSearchableTextPanel';
import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingRunReportModal(c: ParsingTabControllerState) {
  const { t, runModals } = c;
  const { reportModalRun, reportJson, reportSearchQuery, setReportSearchQuery, closeReportModal } =
    runModals;
  return (
    <Modal
      isOpen={Boolean(reportModalRun)}
      onClose={() => {
        closeReportModal();
      }}
      title={t('admin.parsing.reportTitle')}
      size="large"
    >
      {
        <ParsingSearchableTextPanel
          content={reportJson}
          query={reportSearchQuery}
          onQueryChange={setReportSearchQuery}
          copyLabel={t('admin.parsing.reportTitle')}
        />
      }
    </Modal>
  );
}
