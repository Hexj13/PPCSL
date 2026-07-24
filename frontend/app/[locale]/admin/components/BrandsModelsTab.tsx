'use client';

import { useCallback, useEffect, useState } from 'react';

import { usePaginatedData } from '@/hooks/usePaginatedData';
import { useRefreshWhenVisible } from '@/hooks/useRefreshWhenVisible';
import { useTranslation } from '@/hooks/useTranslation';
import type { AdminBrand, AdminModel } from '@/lib/api';
import { adminApi } from '@/lib/api';
import { toast } from '@/lib/toast';

import { AdminTableSkeleton } from './AdminTableShared';
import type { ArchiveTarget } from './ArchiveConfirmModal';
import { ArchiveConfirmModal } from './ArchiveConfirmModal';
import { BrandFormModal } from './BrandFormModal';
import { BrandsModelsFilters } from './BrandsModelsFilters';
import { BrandsModelsTable } from './BrandsModelsTable';
import { ModelFormModal } from './ModelFormModal';
import { TireBrandFormModal } from './TireBrandFormModal';
import { TireModelFormModal } from './TireModelFormModal';

type Segment = '' | 'car' | 'truck' | 'moto';

type BrandsModelsFiltersState = {
  searchQuery: string;
  catalog: 'vehicle' | 'tire';
  vehicleSegment: Segment;
};

interface BrandsModelsTabProps {
  isActive: boolean;
}

export function BrandsModelsTab({ isActive }: BrandsModelsTabProps) {
  const { t } = useTranslation();
  const [expandedBrandIds, setExpandedBrandIds] = useState<Set<string>>(new Set());
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(null);
  const [brandModal, setBrandModal] = useState<AdminBrand | null | 'create'>(null);
  const [modelModal, setModelModal] = useState<
    | { mode: 'create'; brandId?: string }
    | { mode: 'edit'; model: AdminModel; brandName: string }
    | null
  >(null);
  const [tireBrandModal, setTireBrandModal] = useState<AdminBrand | null | 'create'>(null);
  const [tireModelModal, setTireModelModal] = useState<
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
  } = usePaginatedData<AdminBrand, BrandsModelsFiltersState>({
    fetchFn: async (pageNum, limitNum, filtersData) => {
      if (filtersData.catalog === 'tire') {
        const res = await adminApi.getTireBrandsModels(
          pageNum,
          limitNum,
          filtersData.searchQuery || undefined,
          undefined,
        );
        return { data: res.data.data, meta: res.data.meta };
      }
      const res = await adminApi.getBrandsModels(
        pageNum,
        limitNum,
        filtersData.searchQuery || undefined,
        filtersData.vehicleSegment || undefined,
      );
      return { data: res.data.data, meta: res.data.meta };
    },
    limit: 100,
    initialFilters: {
      searchQuery: '',
      catalog: 'vehicle',
      vehicleSegment: '',
    },
    debounceFilters: ['searchQuery'],
    debounceMs: 500,
    showLoadingDelay: 300,
  });

  useRefreshWhenVisible(isActive, () => {
    reload(true);
  });

  useEffect(() => {
    setExpandedBrandIds(new Set());
  }, [filters.catalog, filters.vehicleSegment]);

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
      const tire = filters.catalog === 'tire';
      if (archiveTarget.type === 'brand') {
        if (tire) {
          await adminApi.archiveTireBrand(archiveTarget.id);
        } else {
          await adminApi.archiveBrand(archiveTarget.id);
        }
      } else if (tire) {
        await adminApi.archiveTireModel(archiveTarget.id);
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
  }, [archiveTarget, filters.catalog, reload, t]);

  const handleUnarchiveBrand = useCallback(
    async (id: string) => {
      try {
        if (filters.catalog === 'tire') {
          await adminApi.unarchiveTireBrand(id);
        } else {
          await adminApi.unarchiveBrand(id);
        }
        toast.success(t('admin.brandsModelsTab.unarchiveSuccess'));
        reload();
      } catch {
        toast.error(t('admin.brandsModelsTab.unarchiveError'));
      }
    },
    [filters.catalog, reload, t],
  );

  const handleUnarchiveModel = useCallback(
    async (id: string) => {
      try {
        if (filters.catalog === 'tire') {
          await adminApi.unarchiveTireModel(id);
        } else {
          await adminApi.unarchiveModel(id);
        }
        toast.success(t('admin.brandsModelsTab.unarchiveSuccess'));
        reload();
      } catch {
        toast.error(t('admin.brandsModelsTab.unarchiveError'));
      }
    },
    [filters.catalog, reload, t],
  );

  const formatVehicleTypes = useCallback(
    (types: ('car' | 'truck' | 'moto' | 'tire')[]) => {
      const keys = {
        car: 'vehicleTypeCar',
        truck: 'vehicleTypeTruck',
        moto: 'vehicleTypeMoto',
        tire: 'vehicleTypeTire',
      } as const;
      return types.map((x) => t(`admin.brandsModelsTab.${keys[x]}`)).join(', ');
    },
    [t],
  );

  return (
    <div>
      <BrandsModelsFilters
        searchQuery={filters.searchQuery}
        onSearchChange={(value) => setFilters((prev) => ({ ...prev, searchQuery: value }))}
        catalog={filters.catalog}
        onCatalogChange={(catalog) => setFilters((prev) => ({ ...prev, catalog }))}
        vehicleSegment={filters.vehicleSegment}
        onVehicleSegmentChange={(vehicleSegment) =>
          setFilters((prev) => ({ ...prev, catalog: 'vehicle', vehicleSegment }))
        }
        onAddBrand={() =>
          filters.catalog === 'tire' ? setTireBrandModal('create') : setBrandModal('create')
        }
        onAddModel={() =>
          filters.catalog === 'tire'
            ? setTireModelModal({ mode: 'create' })
            : setModelModal({ mode: 'create' })
        }
      />

      {brands.length === 0 ? (
        loading ? (
          <div role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">{t('common.loading')}</span>
            <AdminTableSkeleton />
          </div>
        ) : (
          <div className="text-center py-8 text-text-secondary">
            {t('admin.brandsModelsTab.noBrands')}
          </div>
        )
      ) : (
        <BrandsModelsTable
          brands={brands}
          catalog={filters.catalog}
          vehicleType={filters.vehicleSegment}
          expandedBrandIds={expandedBrandIds}
          currentPage={page}
          totalPages={meta?.totalPages ?? 1}
          toggleExpand={toggleExpand}
          onEditBrand={(b) =>
            filters.catalog === 'tire' ? setTireBrandModal(b) : setBrandModal(b)
          }
          onEditModel={(model, brandName) =>
            filters.catalog === 'tire'
              ? setTireModelModal({ mode: 'edit', model, brandName })
              : setModelModal({ mode: 'edit', model, brandName })
          }
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

      <TireBrandFormModal
        isOpen={tireBrandModal !== null}
        onClose={() => setTireBrandModal(null)}
        onSuccess={() => {
          setTireBrandModal(null);
          reload();
        }}
        brand={tireBrandModal === 'create' ? null : tireBrandModal}
      />

      <TireModelFormModal
        isOpen={tireModelModal !== null}
        onClose={() => setTireModelModal(null)}
        onSuccess={() => {
          setTireModelModal(null);
          reload();
        }}
        initialBrandId={tireModelModal?.mode === 'create' ? tireModelModal.brandId : undefined}
        editModel={tireModelModal?.mode === 'edit' ? tireModelModal.model : undefined}
        editBrandName={tireModelModal?.mode === 'edit' ? tireModelModal.brandName : undefined}
      />
    </div>
  );
}
