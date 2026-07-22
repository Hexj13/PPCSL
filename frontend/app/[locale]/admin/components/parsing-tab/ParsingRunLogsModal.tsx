'use client';

import { Modal } from '@/components/modals/Modal';
import { InfoBlock } from '@/ui';

import { ParsingSearchableTextPanel } from './ParsingSearchableTextPanel';
import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingRunLogsModal(c: ParsingTabControllerState) {
  const { t, runModals } = c;
  const {
    logsModalRun,
    hasLogContent,
    logLines,
    logsSearchQuery,
    setLogsSearchQuery,
    closeLogsModal,
  } = runModals;
  return (
    <Modal
      isOpen={Boolean(logsModalRun)}
      onClose={() => {
        closeLogsModal();
      }}
      title={t('admin.parsing.logsTitle')}
      size="large"
    >
      {hasLogContent ? (
        <ParsingSearchableTextPanel
          content={logLines.join('\n')}
          query={logsSearchQuery}
          onQueryChange={setLogsSearchQuery}
          copyLabel={t('admin.parsing.logsTitle')}
        />
      ) : (
        <InfoBlock>{t('admin.parsing.logsEmpty')}</InfoBlock>
      )}
    </Modal>
  );
}
