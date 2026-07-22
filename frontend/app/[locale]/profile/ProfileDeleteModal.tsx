import { Modal } from '@/components/modals/Modal';
import type { TranslationFn } from '@/hooks/useTranslation';

export function ProfileDeleteModal({
  isOpen,
  onClose,
  deleting,
  t,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  deleting: boolean;
  t: TranslationFn;
  onConfirm: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('common.deleteAccount')} size="medium">
      <div className="space-y-4">
        <div className="bg-red-600/15 border border-red-600/50 rounded-lg p-4">
          <p className="text-lg text-red-600 font-semibold mb-2">{t('profile.deleteWarning')}</p>
          <p className="text-text-secondary text-sm leading-relaxed">
            {t('profile.deleteWarningDescription')}
          </p>
          <ul className="list-disc list-inside text-text-secondary text-sm mt-2 space-y-1 ml-2">
            <li>{t('profile.deleteWarningPoint1')}</li>
            <li>{t('profile.deleteWarningPoint2')}</li>
            <li>{t('profile.deleteWarningPoint3')}</li>
            <li>{t('profile.deleteWarningPoint4')}</li>
          </ul>
        </div>
        <p className="text-text-secondary text-sm">{t('profile.deleteConfirm')}</p>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover-only:hover:text-text-primary transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-red-600/50 hover-only:hover:border-red-700/60 bg-red-600/15 hover-only:hover:bg-red-600/25 text-red-600 font-semibold text-base hover-only:hover:text-red-700 transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? t('profile.deleting') : t('profile.deleteAccount')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
