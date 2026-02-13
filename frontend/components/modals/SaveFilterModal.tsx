'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { savedFiltersApi } from '@/lib/api';

import { Modal } from './Modal';

interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  filters?: Record<string, unknown>;
  filterId?: string;
  initialName?: string;
}

export function SaveFilterModal({
  isOpen,
  onClose,
  onSave,
  filters,
  filterId,
  initialName = '',
}: SaveFilterModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
    }
  }, [isOpen, initialName]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('saveFilter.nameRequired'));
      return;
    }

    if (name.length > 100) {
      toast.error(t('saveFilter.nameMaxLength'));
      return;
    }

    if (filterId && name.trim() === initialName.trim()) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      if (filterId) {
        await savedFiltersApi.update(filterId, name.trim());
        toast.success(t('saveFilter.filterUpdated'));
      } else if (filters) {
        await savedFiltersApi.create(name.trim(), filters);
        analytics.saveFilter(name.trim(), filters);
        toast.success(t('saveFilter.filterSaved'));
      }
      setName('');
      onSave();
      onClose();
    } catch (error: unknown) {
      const errorMessage =
        (error && typeof error === 'object' && 'response' in error
          ? (error.response as { data?: { message?: string } })?.data?.message
          : null) || (filterId ? t('saveFilter.updateError') : t('saveFilter.saveError'));
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName(initialName);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={filterId ? t('saveFilter.editTitle') : t('saveFilter.saveTitle')}
      size="small"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2 text-text-secondary">
            {t('saveFilter.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !saving) {
                handleSave();
              }
            }}
            maxLength={100}
            className="input-field"
            placeholder={t('saveFilter.nameRequired')}
            autoFocus
          />
          <p className="text-xs text-text-secondary mt-1">
            {name.length}
            {t('saveFilter.maxLength')}
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="flex-1 text-primary-700 font-medium text-xs md:text-sm lg:text-base hover:text-primary-900 hover:border-primary-900 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-700 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 text-primary-700 font-medium text-xs md:text-sm lg:text-base hover:text-primary-900 hover:border-primary-900 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t('saveFilter.saving') : t('saveFilter.save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
