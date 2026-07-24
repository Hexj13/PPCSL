'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Dropdown } from '@/components/common/Dropdown';
import { Modal } from '@/components/modals/Modal';
import { useTranslation } from '@/hooks/useTranslation';
import type { AdminBrand, CreateBrandPayload, UpdateBrandPayload } from '@/lib/api';
import { adminApi } from '@/lib/api';
import {
  POPULAR_BRAND_COUNTRIES,
  type PopularBrandCountry,
} from '@/lib/content/popular-brand-countries';
import { toast } from '@/lib/toast';
import { Checkbox } from '@/ui';

import { AdminActionButton } from './AdminButtons';

const VEHICLE_TYPES = ['car', 'truck', 'moto', 'tire'] as const;

interface BrandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  brand: AdminBrand | null;
}

export function BrandFormModal({ isOpen, onClose, onSuccess, brand }: BrandFormModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<('car' | 'truck' | 'moto' | 'tire')[]>(['car']);
  const [popularCountry, setPopularCountry] = useState<PopularBrandCountry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  const isEdit = !!brand;

  const popularCountryOptions = useMemo(
    () => [
      { value: '', label: t('admin.brandsModelsTab.popularCountryNone') },
      ...POPULAR_BRAND_COUNTRIES.map((country) => ({
        value: country,
        label: t(`admin.brandsModelsTab.popularCountry.${country}`),
      })),
    ],
    [t],
  );

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!justOpened) return;

    setName(brand?.name ?? '');
    setVehicleTypes(brand?.vehicleTypes?.length ? [...brand.vehicleTypes] : ['car']);
    setPopularCountry(brand?.popularCountry ?? null);
    setNameError(null);
  }, [isOpen, brand]);

  const toggleType = (type: 'car' | 'truck' | 'moto' | 'tire') => {
    setVehicleTypes((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
      return next.length > 0 ? next : prev;
    });
  };

  const handlePopularCountryChange = (value: string) => {
    if (value === '') {
      setPopularCountry(null);
      return;
    }
    if ((POPULAR_BRAND_COUNTRIES as readonly string[]).includes(value)) {
      setPopularCountry(value as PopularBrandCountry);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    if (vehicleTypes.length === 0) return;
    setSubmitting(true);
    try {
      if (isEdit && brand) {
        const payload: UpdateBrandPayload = {
          name: name.trim(),
          vehicleTypes,
          popularCountry,
        };
        await adminApi.updateBrand(brand.id, payload);
      } else {
        const payload: CreateBrandPayload = {
          name: name.trim(),
          vehicleTypes,
          popularCountry,
        };
        await adminApi.createBrand(payload);
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
          ? t('admin.brandsModelsTab.editBrandTitle')
          : t('admin.brandsModelsTab.createBrandTitle')
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
                label={t(
                  `admin.brandsModelsTab.vehicleType${type.charAt(0).toUpperCase() + type.slice(1)}`,
                )}
                size="sm"
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-900 mb-1">
            {t('admin.brandsModelsTab.fieldPopularCountry')}
          </label>
          <Dropdown
            value={popularCountry ?? ''}
            onChange={handlePopularCountryChange}
            options={popularCountryOptions}
            placeholder={t('admin.brandsModelsTab.popularCountryNone')}
            renderMenuInPortal
            className="w-full"
          />
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
            disabled={submitting || vehicleTypes.length === 0}
          >
            {t('common.save')}
          </AdminActionButton>
        </div>
      </form>
    </Modal>
  );
}
