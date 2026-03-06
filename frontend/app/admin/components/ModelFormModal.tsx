'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { Dropdown } from '@/components/common/Dropdown';
import { Modal } from '@/components/modals/Modal';
import { useTranslation } from '@/hooks/useTranslation';
import type { AdminBrand, AdminModel, CreateModelPayload, UpdateModelPayload } from '@/lib/api';
import { adminApi } from '@/lib/api';
import { Checkbox } from '@/ui';

const VEHICLE_TYPES = ['car', 'truck', 'moto'] as const;

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
  const [vehicleTypes, setVehicleTypes] = useState<('car' | 'truck' | 'moto')[]>(['car']);
  const [submitting, setSubmitting] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const isEdit = !!editModel;
  const selectedBrand = brands.find((b) => b.id === brandId);
  const allowedTypes = useMemo(
    () => (selectedBrand?.vehicleTypes ?? []) as ('car' | 'truck' | 'moto')[],
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

  const toggleType = (type: 'car' | 'truck' | 'moto') => {
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
            <div className="w-full px-4 py-2.5 rounded-lg border-2 border-primary-700/50 bg-bg-darker text-text-secondary opacity-60 cursor-not-allowed">
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
            className={`w-full px-4 py-2.5 rounded-lg border-2 bg-bg-secondary text-text-primary focus:outline-hidden focus:border-primary-900 ${
              nameError ? 'border-red-500' : 'border-primary-700'
            }`}
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
            disabled={submitting || !brandId || vehicleTypes.length === 0}
            className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-primary-600 hover-only:hover:border-primary-700 bg-primary-500/20 text-primary-800 font-semibold text-base hover-only:hover:bg-primary-500/30 transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
