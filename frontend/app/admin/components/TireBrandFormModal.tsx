'use client';

import { useEffect, useState } from 'react';

import { Modal } from '@/components/modals/Modal';
import { useTranslation } from '@/hooks/useTranslation';
import type { AdminBrand, CreateTireBrandPayload, UpdateTireBrandPayload } from '@/lib/api';
import { adminApi } from '@/lib/api';
import { toast } from '@/lib/toast';

interface TireBrandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  brand: AdminBrand | null;
}

export function TireBrandFormModal({ isOpen, onClose, onSuccess, brand }: TireBrandFormModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const isEdit = !!brand;

  useEffect(() => {
    if (isOpen) {
      setName(brand?.name ?? '');
      setNameError(null);
    }
  }, [isOpen, brand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setSubmitting(true);
    try {
      if (isEdit && brand) {
        const payload: UpdateTireBrandPayload = { name: name.trim() };
        await adminApi.updateTireBrand(brand.id, payload);
      } else {
        const payload: CreateTireBrandPayload = { name: name.trim() };
        await adminApi.createTireBrand(payload);
      }
      toast.success(t('admin.brandsModelsTab.saveSuccess'));
      onSuccess();
    } catch (err: unknown) {
      const ax =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number; data?: { code?: string; message?: string } } })
          : null;
      const res = ax?.response?.data;
      const status = ax?.response?.status;
      const message = res?.message ?? t('admin.brandsModelsTab.saveError');
      const isDuplicate = res?.code === 'DUPLICATE_NAME' || status === 409;
      if (isDuplicate) {
        setNameError(t('admin.brandsModelsTab.duplicateNameError'));
        return;
      }
      toast.error(typeof message === 'string' ? message : t('admin.brandsModelsTab.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit
          ? t('admin.brandsModelsTab.editTireBrandTitle')
          : t('admin.brandsModelsTab.createTireBrandTitle')
      }
      size="medium"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-primary-900 mb-1">
            {t('admin.brandsModelsTab.fieldName')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            placeholder={t('admin.brandsModelsTab.namePlaceholderBrand')}
            className={`w-full px-4 py-2.5 rounded-lg border-2 bg-bg-secondary text-text-primary focus:outline-hidden focus:border-primary-900 ${
              nameError ? 'border-red-500' : 'border-primary-700'
            }`}
            maxLength={100}
            required
          />
          {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover-only:hover:text-text-primary transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-primary-600 hover-only:hover:border-primary-700 bg-primary-500/20 text-primary-800 font-semibold text-base hover-only:hover:bg-primary-500/30 transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
