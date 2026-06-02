'use client';

import { Modal } from '@/components/modals/Modal';
import { InfoBlock } from '@/ui';

import { ParsingSearchableTextPanel } from './ParsingSearchableTextPanel';
import type { ParsingTabControllerState } from './useParsingTabController';

export function ParsingPlpFileContentModal(c: ParsingTabControllerState) {
  const { t, runModals } = c;
  const {
    plpFileModalOpen,
    plpFileData,
    plpFileLoading,
    plpFileSearchQuery,
    setPlpFileSearchQuery,
    closePlpFileModal,
  } = runModals;
  return (
    <Modal
      isOpen={plpFileModalOpen}
      onClose={() => {
        closePlpFileModal();
      }}
      title={t('admin.parsing.fileTitle')}
      size="large"
    >
      {plpFileLoading ? (
        <div className="py-8 text-center text-text-secondary">{t('admin.parsing.loading')}</div>
      ) : plpFileData?.content ? (
        <ParsingSearchableTextPanel
          content={plpFileData.content}
          query={plpFileSearchQuery}
          onQueryChange={setPlpFileSearchQuery}
          copyLabel={t('admin.parsing.fileTitle')}
        />
      ) : (
        <InfoBlock>{t('admin.parsing.fileEmpty')}</InfoBlock>
      )}
    </Modal>
  );
}
