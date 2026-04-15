'use client';

import { useEffect, useState } from 'react';

import { Dropdown } from '@/components/common/Dropdown';
import { Modal } from '@/components/modals/Modal';
import { useTranslation } from '@/hooks/useTranslation';
import type {
  AdminBrand,
  AdminModel,
  CreateTireModelPayload,
  UpdateTireModelPayload,
} from '@/lib/api';
import { adminApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Checkbox } from '@/ui';

import { AdminActionButton } from './AdminButtons';

interface TireModelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBrandId?: string;
  editModel?: AdminModel;
  editBrandName?: string;
}

export function TireModelFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialBrandId,
  editModel,
  editBrandName: _editBrandName,
}: TireModelFormModalProps) {
  const { t } = useTranslation();
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [brandId, setBrandId] = useState('');
  const [name, setName] = useState('');
  const [isOther, setIsOther] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const isEdit = !!editModel;
  const selectedBrand = brands.find((b) => b.id === brandId);

  useEffect(() => {
    if (isOpen) {
      setBrandId(editModel?.brandId ?? initialBrandId ?? '');
      setName(editModel?.name ?? '');
      setIsOther(editModel?.isOther ?? false);
      setNameError(null);
    }
  }, [isOpen, editModel, initialBrandId]);

  useEffect(() => {
    if (isOpen) {
      setLoadingBrands(true);
      void adminApi
        .getTireBrandsModels(1, 2000)
        .then((res) => setBrands(res.data.data))
        .finally(() => setLoadingBrands(false));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    if (!brandId) return;
    setSubmitting(true);
    try {
      if (isEdit && editModel) {
        const payload: UpdateTireModelPayload = { name: name.trim(), isOther };
        await adminApi.updateTireModel(editModel.id, payload);
      } else {
        const payload: CreateTireModelPayload = {
          brandId,
          name: name.trim(),
          isOther,
        };
        await adminApi.createTireModel(payload);
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
          ? t('admin.brandsModelsTab.editTireModelTitle')
          : t('admin.brandsModelsTab.createTireModelTitle')
      }
      size="medium"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-primary-900 mb-1">
            {t('admin.brandsModelsTab.fieldBrand')}
          </label>
          {isEdit ? (
            <div className="input-field w-full cursor-not-allowed opacity-60 pointer-events-none">
              {selectedBrand?.name ?? (loadingBrands ? t('common.loading') : '—')}
            </div>
          ) : (
            <Dropdown
              value={brandId}
              onChange={setBrandId}
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
              disabled={loadingBrands}
              placeholder={t('admin.brandsModelsTab.brandPlaceholder')}
              searchable
              renderMenuInPortal
              className="w-full"
            />
          )}
        </div>
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
            placeholder={t('admin.brandsModelsTab.namePlaceholderModel')}
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
        <Checkbox
          checked={isOther}
          onChange={() => setIsOther((v) => !v)}
          label={t('admin.brandsModelsTab.fieldIsOtherTireModel')}
          size="sm"
        />
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <AdminActionButton variant="secondary" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </AdminActionButton>
          <AdminActionButton type="submit" className="flex-1" disabled={submitting || !brandId}>
            {t('common.save')}
          </AdminActionButton>
        </div>
      </form>
    </Modal>
  );
}
