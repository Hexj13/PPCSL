'use client';

import { Modal } from '@/components/modals/Modal';
import { useTranslation } from '@/hooks/useTranslation';

export type ArchiveTarget =
  | { type: 'brand'; id: string; name: string }
  | { type: 'model'; id: string; name: string };

interface ArchiveConfirmModalProps {
  isOpen: boolean;
  target: ArchiveTarget | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function ArchiveConfirmModal({
  isOpen,
  target,
  onClose,
  onConfirm,
}: ArchiveConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('admin.brandsModelsTab.archiveConfirmTitle')}
      size="small"
    >
      <div className="space-y-6">
        <div className="space-y-3">
          {target?.type === 'brand' && (
            <p className="text-base leading-relaxed text-text-secondary">
              {t('admin.brandsModelsTab.archiveMessageBrand')}
            </p>
          )}
          {target?.type === 'model' && (
            <p className="text-base leading-relaxed text-text-secondary">
              {t('admin.brandsModelsTab.archiveMessageModel')}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="close-confirm-btn flex-1 min-h-[48px] h-12 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-gray-500/40 hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover:text-text-primary transition-colors duration-200 select-none"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="close-confirm-btn flex-1 min-h-[48px] h-12 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-primary-600 hover:border-primary-700 bg-primary-500/20 text-primary-800 font-semibold text-base hover:bg-primary-500/30 transition-colors duration-200 select-none"
          >
            {t('admin.brandsModelsTab.archiveConfirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
