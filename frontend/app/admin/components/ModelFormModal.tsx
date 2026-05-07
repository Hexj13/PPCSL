'use client';

import { useEffect, useMemo, useState } from 'react';

import { Dropdown } from '@/components/common/Dropdown';
import { Modal } from '@/components/modals/Modal';
import { useTranslation } from '@/hooks/useTranslation';
import type { AdminBrand, AdminModel, CreateModelPayload, UpdateModelPayload } from '@/lib/api';
import { adminApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Checkbox } from '@/ui';

import { AdminActionButton } from './AdminButtons';

const VEHICLE_TYPES = ['car', 'truck', 'moto', 'tire'] as const;

interface ModelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBrandId?: string;
  editModel?: AdminModel;
  editBrandName?: string;
}

export function ModelFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialBrandId,
  editModel,
  editBrandName: _editBrandName,
}: ModelFormModalProps) {
  const { t } = useTranslation();
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [brandId, setBrandId] = useState('');
  const [name, setName] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<('car' | 'truck' | 'moto' | 'tire')[]>(['car']);
  const [submitting, setSubmitting] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const isEdit = !!editModel;
  const selectedBrand = brands.find((b) => b.id === brandId);
  const allowedTypes = useMemo(
    () => (selectedBrand?.vehicleTypes ?? []) as ('car' | 'truck' | 'moto' | 'tire')[],
    [selectedBrand?.vehicleTypes],
  );

  useEffect(() => {
    if (isOpen) {
      setBrandId(editModel?.brandId ?? initialBrandId ?? '');
      setName(editModel?.name ?? '');
      setVehicleTypes(
        editModel?.vehicleTypes?.length ? [...editModel.vehicleTypes] : isEdit ? ['car'] : [],
      );
      setNameError(null);
    }
  }, [isOpen, editModel, initialBrandId, isEdit]);

  useEffect(() => {
    if (isOpen) {
      setLoadingBrands(true);
      void adminApi
        .getBrandsModels(1, 2000)
        .then((res) => setBrands(res.data.data))
        .finally(() => setLoadingBrands(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (brandId && selectedBrand && allowedTypes.length > 0) {
      setVehicleTypes((prev) => prev.filter((t) => allowedTypes.includes(t)));
    }
  }, [brandId, selectedBrand, allowedTypes]);

  const toggleType = (type: 'car' | 'truck' | 'moto' | 'tire') => {
    if (!selectedBrand || !allowedTypes.includes(type)) return;
    setVehicleTypes((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    if (!brandId || vehicleTypes.length === 0) return;
    setSubmitting(true);
    try {
      if (isEdit && editModel) {
        const payload: UpdateModelPayload = { name: name.trim(), vehicleTypes };
        await adminApi.updateModel(editModel.id, payload);
      } else {
        const payload: CreateModelPayload = { brandId, name: name.trim(), vehicleTypes };
        await adminApi.createModel(payload);
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
          ? t('admin.brandsModelsTab.editModelTitle')
          : t('admin.brandsModelsTab.createModelTitle')
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
        <div>
          <span className="block text-sm font-medium text-primary-900 mb-2">
            {t('admin.brandsModelsTab.fieldVehicleTypes')}
          </span>
          <div className="flex flex-wrap gap-4">
            {VEHICLE_TYPES.map((type) => (
              <Checkbox
                key={type}
                checked={vehicleTypes.includes(type)}
                onChange={() => toggleType(type)}
                disabled={!selectedBrand || !allowedTypes.includes(type)}
                label={t(
                  `admin.brandsModelsTab.vehicleType${type.charAt(0).toUpperCase() + type.slice(1)}`,
                )}
                size="sm"
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2 shrink-0">
          <AdminActionButton
            variant="secondary"
            className="w-full shrink-0 sm:flex-1"
            onClick={onClose}
          >
            {t('common.cancel')}
          </AdminActionButton>
          <AdminActionButton
            type="submit"
            className="w-full shrink-0 sm:flex-1"
            disabled={submitting || !brandId || vehicleTypes.length === 0}
          >
            {t('common.save')}
          </AdminActionButton>
        </div>
      </form>
    </Modal>
  );
}
