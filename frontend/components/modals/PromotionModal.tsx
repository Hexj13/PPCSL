'use client';

import { useState, useEffect } from 'react';

import { Modal } from '@/components/modals/Modal';
import { useTranslation } from '@/hooks/useTranslation';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (_days: number | null) => void;
  isAdmin?: boolean;
  showPartnerBalanceOption?: boolean;
  disableStandardOptions?: boolean;
  partnerBalance?: number;
}

const PROMOTION_OPTIONS = [
  { days: 1, labelKey: 'promotion.oneDay' },
  { days: 7, labelKey: 'promotion.days7' },
  { days: 14, labelKey: 'promotion.days14' },
  { days: 30, labelKey: 'promotion.days30' },
];

export function PromotionModal({
  isOpen,
  onClose,
  onSelect,
  isAdmin = false,
  showPartnerBalanceOption = false,
  disableStandardOptions = false,
  partnerBalance = 0,
}: PromotionModalProps) {
  const { t } = useTranslation();
  const displayBalance = Math.max(0, partnerBalance);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedDays(null);
      setHasSelection(false);
    }
  }, [isOpen]);

  const handleSelect = (days: number | null) => {
    setSelectedDays(days);
    setHasSelection(true);
  };

  const handleConfirm = () => {
    if (hasSelection) {
      onSelect(selectedDays);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('promotion.selectPeriod')}>
      <div className="flex flex-col gap-4" data-testid="promotion-modal">
        {showPartnerBalanceOption ? (
          <div>
            <span className="text-primary-700 font-semibold">
              {t('profile.partnerFreePromotionBalance')}
            </span>{' '}
            <span className="text-text-secondary">{displayBalance}</span>
          </div>
        ) : null}
        <div
          className={`grid min-w-0 gap-3 ${
            isAdmin
              ? 'grid-cols-5'
              : showPartnerBalanceOption
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
                : 'grid-cols-4'
          } [&>button]:min-w-0`}
        >
          {PROMOTION_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              data-testid={`promotion-period-${option.days}`}
              onClick={() => handleSelect(option.days)}
              disabled={disableStandardOptions && !isAdmin}
              className={`aspect-square min-w-0 px-4 py-3 rounded-lg border-2 transition-colors flex items-center justify-center overflow-hidden disabled:cursor-not-allowed ${
                selectedDays === option.days && !(disableStandardOptions && !isAdmin)
                  ? 'bg-primary-500/10 border-primary-700 text-primary-700'
                  : disableStandardOptions && !isAdmin
                    ? 'bg-bg-secondary/50 border-primary-700/20 text-text-secondary opacity-60'
                    : 'bg-bg-secondary border-primary-700/30 hover-only:hover:border-primary-700 text-primary-900'
              }`}
            >
              <div
                className="min-w-0 truncate font-semibold text-center text-inherit"
                title={t(option.labelKey)}
              >
                {t(option.labelKey)}
              </div>
            </button>
          ))}

          {showPartnerBalanceOption && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              disabled={displayBalance <= 0}
              className={`aspect-square min-w-0 px-4 py-3 rounded-lg border-2 transition-colors flex items-center justify-center overflow-hidden disabled:cursor-not-allowed ${
                selectedDays === null && hasSelection
                  ? 'bg-primary-500/10 border-primary-700 text-primary-700'
                  : displayBalance <= 0
                    ? 'bg-bg-secondary/50 border-primary-700/20 text-text-secondary opacity-60'
                    : 'bg-bg-secondary border-primary-700/30 hover-only:hover:border-primary-700 text-primary-900'
              }`}
            >
              <div
                className="min-w-0 truncate font-semibold text-center text-inherit"
                title={t('promotion.partnerUnlimited')}
              >
                {t('promotion.partnerUnlimited')}
              </div>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`aspect-square min-w-0 px-4 py-3 rounded-lg border-2 transition-colors flex items-center justify-center overflow-hidden ${
                selectedDays === null && hasSelection
                  ? 'bg-primary-500/10 border-primary-700 text-primary-700'
                  : 'bg-bg-secondary border-primary-700/30 hover-only:hover:border-primary-700 text-primary-900'
              }`}
            >
              <div
                className="min-w-0 truncate font-semibold text-center text-inherit"
                title={t('promotion.unlimited')}
              >
                {t('promotion.unlimited')}
              </div>
            </button>
          )}
        </div>

        <div className="flex justify-end pt-2 shrink-0">
          <button
            type="button"
            data-testid="promotion-modal-confirm"
            onClick={handleConfirm}
            disabled={!hasSelection}
            className="w-full sm:w-auto shrink-0 min-h-[48px] h-[48px] px-8 text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
