'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

import { usePaginatedData } from '@/hooks/usePaginatedData';
import { useTranslation } from '@/hooks/useTranslation';
import type { AdminBrand, AdminModel } from '@/lib/api';
import { adminApi } from '@/lib/api';

import type { ArchiveTarget } from './ArchiveConfirmModal';
import { ArchiveConfirmModal } from './ArchiveConfirmModal';
import { BrandFormModal } from './BrandFormModal';
import { BrandsModelsFilters } from './BrandsModelsFilters';
import { BrandsModelsTable } from './BrandsModelsTable';
import { ModelFormModal } from './ModelFormModal';

export function BrandsModelsTab() {
  const { t } = useTranslation();
  const [expandedBrandIds, setExpandedBrandIds] = useState<Set<string>>(new Set());
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(null);
  const [brandModal, setBrandModal] = useState<AdminBrand | null | 'create'>(null);
  const [modelModal, setModelModal] = useState<
    | { mode: 'create'; brandId?: string }
    | { mode: 'edit'; model: AdminModel; brandName: string }
    | null
  >(null);

  const {
    data: brands,
    loading,
    meta,
    page,
    filters,
    setFilters,
    setPage,
    reload,
  } = usePaginatedData<
    AdminBrand,
    { searchQuery: string; vehicleType: '' | 'car' | 'truck' | 'moto' }
  >({
    fetchFn: async (pageNum, limitNum, filtersData) => {
      const res = await adminApi.getBrandsModels(
        pageNum,
        limitNum,
        filtersData.searchQuery || undefined,
        filtersData.vehicleType || undefined,
      );
      return { data: res.data.data, meta: res.data.meta };
    },
    limit: 100,
    initialFilters: { searchQuery: '', vehicleType: '' },
    debounceFilters: ['searchQuery'],
    debounceMs: 500,
    showLoadingDelay: 300,
  });

  const toggleExpand = useCallback((brandId: string) => {
    setExpandedBrandIds((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) next.delete(brandId);
      else next.add(brandId);
      return next;
    });
  }, []);

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return;
    try {
      if (archiveTarget.type === 'brand') {
        await adminApi.archiveBrand(archiveTarget.id);
      } else {
        await adminApi.archiveModel(archiveTarget.id);
      }
      toast.success(t('admin.brandsModelsTab.archiveSuccess'));
      setArchiveTarget(null);
      reload();
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : t('admin.brandsModelsTab.archiveError');
      toast.error(message);
    }
  }, [archiveTarget, reload, t]);

  const handleUnarchiveBrand = useCallback(
    async (id: string) => {
      try {
        await adminApi.unarchiveBrand(id);
        toast.success(t('admin.brandsModelsTab.unarchiveSuccess'));
        reload();
      } catch {
        toast.error(t('admin.brandsModelsTab.unarchiveError'));
      }
    },
    [reload, t],
  );

  const handleUnarchiveModel = useCallback(
    async (id: string) => {
      try {
        await adminApi.unarchiveModel(id);
        toast.success(t('admin.brandsModelsTab.unarchiveSuccess'));
        reload();
      } catch {
        toast.error(t('admin.brandsModelsTab.unarchiveError'));
      }
    },
    [reload, t],
  );

  const formatVehicleTypes = useCallback(
    (types: ('car' | 'truck' | 'moto')[]) => {
      const keys = {
        car: 'vehicleTypeCar',
        truck: 'vehicleTypeTruck',
        moto: 'vehicleTypeMoto',
      } as const;
      return types.map((x) => t(`admin.brandsModelsTab.${keys[x]}`)).join(', ');
    },
    [t],
  );

  if (loading && brands.length === 0) {
    return <div className="text-center py-8 text-text-secondary">{t('common.loading')}</div>;
  }

  return (
    <div>
      <BrandsModelsFilters
        searchQuery={filters.searchQuery}
        vehicleType={filters.vehicleType}
        onSearchChange={(value) => setFilters((prev) => ({ ...prev, searchQuery: value }))}
        onVehicleTypeChange={(value) => setFilters((prev) => ({ ...prev, vehicleType: value }))}
        onAddBrand={() => setBrandModal('create')}
        onAddModel={() => setModelModal({ mode: 'create' })}
      />

      {brands.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          {t('admin.brandsModelsTab.noBrands')}
        </div>
      ) : (
        <BrandsModelsTable
          brands={brands}
          vehicleType={filters.vehicleType}
          expandedBrandIds={expandedBrandIds}
          currentPage={page}
          totalPages={meta?.totalPages ?? 1}
          toggleExpand={toggleExpand}
          onEditBrand={setBrandModal}
          onEditModel={(model, brandName) => setModelModal({ mode: 'edit', model, brandName })}
          setArchiveTarget={setArchiveTarget}
          onUnarchiveBrand={handleUnarchiveBrand}
          onUnarchiveModel={handleUnarchiveModel}
          onPageChange={setPage}
          formatVehicleTypes={formatVehicleTypes}
        />
      )}

      <ArchiveConfirmModal
        isOpen={!!archiveTarget}
        target={archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
      />

      <BrandFormModal
        isOpen={brandModal !== null}
        onClose={() => setBrandModal(null)}
        onSuccess={() => {
          setBrandModal(null);
          reload();
        }}
        brand={brandModal === 'create' ? null : brandModal}
      />

      <ModelFormModal
        isOpen={modelModal !== null}
        onClose={() => setModelModal(null)}
        onSuccess={() => {
          setModelModal(null);
          reload();
        }}
        initialBrandId={modelModal?.mode === 'create' ? modelModal.brandId : undefined}
        editModel={modelModal?.mode === 'edit' ? modelModal.model : undefined}
        editBrandName={modelModal?.mode === 'edit' ? modelModal.brandName : undefined}
      />
    </div>
  );
}
