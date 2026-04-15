'use client';

import { useEffect, useState } from 'react';

import { Modal } from '@/components/modals/Modal';
import { useTranslation } from '@/hooks/useTranslation';
import type { AdminBrand, CreateTireBrandPayload, UpdateTireBrandPayload } from '@/lib/api';
import { adminApi } from '@/lib/api';
import { toast } from '@/lib/toast';

import { AdminActionButton } from './AdminButtons';

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
            className={[
              'input-field w-full',
              nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            maxLength={100}
            required
          />
          {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <AdminActionButton variant="secondary" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </AdminActionButton>
          <AdminActionButton type="submit" className="flex-1" disabled={submitting || !name.trim()}>
            {t('common.save')}
          </AdminActionButton>
        </div>
      </form>
    </Modal>
  );
}
