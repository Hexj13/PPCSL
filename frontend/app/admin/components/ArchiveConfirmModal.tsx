'use client';

import { useTranslation } from '@/hooks/useTranslation';

import { AdminConfirmModal } from './AdminTableShared';

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
  const message = target
    ? target.type === 'brand'
      ? t('admin.brandsModelsTab.archiveMessageBrand')
      : t('admin.brandsModelsTab.archiveMessageModel')
    : '';

  return (
    <AdminConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t('admin.brandsModelsTab.archiveConfirmTitle')}
      message={message}
      cancelLabel={t('common.cancel')}
      confirmLabel={t('admin.brandsModelsTab.archiveConfirm')}
      confirmVariant="primary"
    />
  );
}
