'use client';

import { useState, useEffect } from 'react';

import { Modal } from '@/components/Modal';
import { useTranslation } from '@/hooks/useTranslation';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (_days: number | null) => void;
  isAdmin?: boolean;
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
}: PromotionModalProps) {
  const { t } = useTranslation();
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
      <div className="flex flex-col gap-4">
        <div
          className={`grid min-w-0 gap-3 ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'} [&>button]:min-w-0`}
        >
          {PROMOTION_OPTIONS.map((option) => (
            <button
              key={option.days}
              onClick={() => handleSelect(option.days)}
              className={`aspect-square min-w-0 px-4 py-3 rounded-lg border-2 transition-colors flex items-center justify-center overflow-hidden ${
                selectedDays === option.days
                  ? 'bg-primary-500/20 border-primary-500'
                  : 'bg-bg-secondary border-primary-500/30 hover:border-primary-500/60'
              }`}
            >
              <div
                className="min-w-0 truncate font-semibold text-text-secondary text-center"
                title={t(option.labelKey)}
              >
                {t(option.labelKey)}
              </div>
            </button>
          ))}

          {isAdmin && (
            <button
              onClick={() => handleSelect(null)}
              className={`aspect-square min-w-0 px-4 py-3 rounded-lg border-2 transition-colors flex items-center justify-center overflow-hidden ${
                selectedDays === null && hasSelection
                  ? 'bg-primary-500/20 border-primary-500'
                  : 'bg-bg-secondary border-primary-500/30 hover:border-primary-500/60'
              }`}
            >
              <div
                className="min-w-0 truncate font-semibold text-text-secondary text-center"
                title={t('promotion.unlimited')}
              >
                {t('promotion.unlimited')}
              </div>
            </button>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleConfirm}
            disabled={!hasSelection}
            className="px-8 py-2 md:py-2.5 text-xs md:text-sm lg:text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-500 hover:text-primary-700 hover:border-primary-700 active:text-primary-700 active:border-primary-700 border-2 border-primary-500 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
