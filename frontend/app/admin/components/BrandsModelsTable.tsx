'use client';

import { Fragment } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import type { AdminBrand, AdminModel } from '@/lib/api';
import { Button, ChevronRightIcon, EditIcon, Pagination } from '@/ui';

import { AdminActionButton } from './AdminButtons';
import {
  AdminCopyValueCell,
  adminTableCenteredCellClassName,
  adminTableCenteredSecondaryCellClassName,
  adminTableHeaderClassName,
  adminTablePrimaryButtonClassName,
} from './AdminTableShared';
import type { ArchiveTarget } from './ArchiveConfirmModal';
import type { CatalogMode } from './BrandsModelsFilters';

interface BrandsModelsTableProps {
  brands: AdminBrand[];
  catalog: CatalogMode;
  vehicleType: '' | 'car' | 'truck' | 'moto';
  expandedBrandIds: Set<string>;
  currentPage: number;
  totalPages: number;
  toggleExpand: (brandId: string) => void;
  onEditBrand: (brand: AdminBrand) => void;
  onEditModel: (model: AdminModel, brandName: string) => void;
  setArchiveTarget: (target: ArchiveTarget) => void;
  onUnarchiveBrand: (id: string) => void;
  onUnarchiveModel: (id: string) => void;
  onPageChange: (page: number) => void;
  formatVehicleTypes: (types: ('car' | 'truck' | 'moto' | 'tire')[]) => string;
}

function BrandRow({
  brand,
  catalog,
  filteredModels,
  isExpanded,
  onToggleExpand,
  onEditBrand,
  onEditModel,
  setArchiveTarget,
  onUnarchiveBrand,
  onUnarchiveModel,
  formatVehicleTypes,
}: {
  brand: AdminBrand;
  catalog: CatalogMode;
  filteredModels: AdminModel[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditBrand: () => void;
  onEditModel: (model: AdminModel) => void;
  setArchiveTarget: (target: ArchiveTarget) => void;
  onUnarchiveBrand: () => void;
  onUnarchiveModel: (id: string) => void;
  formatVehicleTypes: (types: ('car' | 'truck' | 'moto' | 'tire')[]) => string;
}) {
  const { t } = useTranslation();

  return (
    <Fragment>
      <tr className="border-b border-primary-700/10">
        <td className="py-2 px-4 text-center">
          {filteredModels.length > 0 ? (
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-1 text-primary-400 hover-only:hover:text-primary-300 hover-only:hover:bg-primary-500/10 rounded-sm transition-colors shrink-0"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <span
                className={`inline-block transition-transform duration-200 ease-out ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </span>
            </button>
          ) : null}
        </td>
        <td className={adminTableCenteredCellClassName}>
          <div className="flex items-center justify-center gap-2">
            <span className="font-medium">{brand.name}</span>
            <button
              type="button"
              onClick={onEditBrand}
              className="p-1 text-primary-400 hover-only:hover:text-primary-300 hover-only:hover:bg-primary-500/10 rounded-sm transition-colors shrink-0"
              aria-label={t('common.edit')}
            >
              <EditIcon className="w-4 h-4" />
            </button>
          </div>
        </td>
        <td className={`${adminTableCenteredCellClassName} min-w-[200px]`} />
        <td className={adminTableCenteredCellClassName}>{brand.activeListingsCount}</td>
        <td className={adminTableCenteredSecondaryCellClassName}>
          {catalog === 'tire'
            ? t('admin.brandsModelsTab.catalogTires')
            : formatVehicleTypes(brand.vehicleTypes)}
        </td>
        <td className={adminTableCenteredCellClassName}>
          <div title={brand.id}>
            <AdminCopyValueCell value={brand.id} label={t('admin.brandsModelsTab.columnId')} />
          </div>
        </td>
        <td className={adminTableCenteredCellClassName}>
          <div className="flex justify-center items-center">
            {brand.isArchived ? (
              <Button type="button" variant="outline" size="xs" onClick={onUnarchiveBrand}>
                {t('admin.brandsModelsTab.unarchiveButton')}
              </Button>
            ) : (
              <AdminActionButton
                variant="secondary"
                className={adminTablePrimaryButtonClassName}
                disabled={brand.activeListingsCount > 0}
                title={
                  brand.activeListingsCount > 0
                    ? t('admin.brandsModelsTab.archiveDisabledHasListings')
                    : undefined
                }
                onClick={() => setArchiveTarget({ type: 'brand', id: brand.id, name: brand.name })}
              >
                {t('admin.brandsModelsTab.archiveConfirm')}
              </AdminActionButton>
            )}
          </div>
        </td>
      </tr>
      {isExpanded &&
        filteredModels.map((model) => (
          <tr
            key={model.id}
            className="admin-expand-row border-b border-primary-700/10 bg-primary-500/5"
          >
            <td className={adminTableCenteredCellClassName} />
            <td className={adminTableCenteredSecondaryCellClassName} />
            <td className={`${adminTableCenteredCellClassName} min-w-[200px]`}>
              <div className="flex items-center justify-center gap-2">
                <span>{model.name}</span>
                <button
                  type="button"
                  onClick={() => onEditModel(model)}
                  className="p-1 text-primary-400 hover-only:hover:text-primary-300 hover-only:hover:bg-primary-500/10 rounded-sm transition-colors shrink-0"
                  aria-label={t('common.edit')}
                >
                  <EditIcon className="w-4 h-4" />
                </button>
              </div>
            </td>
            <td className={adminTableCenteredCellClassName}>{model.activeListingsCount}</td>
            <td className={adminTableCenteredSecondaryCellClassName}>
              {catalog === 'tire'
                ? model.isOther
                  ? t('admin.brandsModelsTab.fieldIsOtherTireModel')
                  : t('admin.brandsModelsTab.emptyCell')
                : formatVehicleTypes(model.vehicleTypes)}
            </td>
            <td className={adminTableCenteredCellClassName}>
              <div title={model.id}>
                <AdminCopyValueCell value={model.id} label={t('admin.brandsModelsTab.columnId')} />
              </div>
            </td>
            <td className={adminTableCenteredCellClassName}>
              <div className="flex justify-center items-center">
                {model.isArchived ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onUnarchiveModel(model.id)}
                  >
                    {t('admin.brandsModelsTab.unarchiveButton')}
                  </Button>
                ) : (
                  <AdminActionButton
                    variant="secondary"
                    className={adminTablePrimaryButtonClassName}
                    disabled={model.activeListingsCount > 0}
                    title={
                      model.activeListingsCount > 0
                        ? t('admin.brandsModelsTab.archiveDisabledHasListings')
                        : undefined
                    }
                    onClick={() =>
                      setArchiveTarget({ type: 'model', id: model.id, name: model.name })
                    }
                  >
                    {t('admin.brandsModelsTab.archiveConfirm')}
                  </AdminActionButton>
                )}
              </div>
            </td>
          </tr>
        ))}
    </Fragment>
  );
}

export function BrandsModelsTable({
  brands,
  catalog,
  vehicleType,
  expandedBrandIds,
  currentPage,
  totalPages,
  toggleExpand,
  onEditBrand,
  onEditModel,
  setArchiveTarget,
  onUnarchiveBrand,
  onUnarchiveModel,
  onPageChange,
  formatVehicleTypes,
}: BrandsModelsTableProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse [&_tbody_tr:nth-child(even)]:bg-primary-500/5">
          <thead>
            <tr className="border-b border-primary-700/30">
              <th className={`${adminTableHeaderClassName} text-center w-10`} />
              <th className={`${adminTableHeaderClassName} text-center`}>
                {t('admin.brandsModelsTab.columnBrand')}
              </th>
              <th className={`${adminTableHeaderClassName} text-center min-w-[200px]`}>
                {t('admin.brandsModelsTab.columnModel')}
              </th>
              <th className={`${adminTableHeaderClassName} text-center`}>
                {t('admin.brandsModelsTab.columnListings')}
              </th>
              <th className={`${adminTableHeaderClassName} text-center`}>
                {t('admin.brandsModelsTab.columnCategory')}
              </th>
              <th className={`${adminTableHeaderClassName} text-center`}>
                {t('admin.brandsModelsTab.columnId')}
              </th>
              <th className={`${adminTableHeaderClassName} text-center`}>
                {t('admin.brandsModelsTab.columnArchive')}
              </th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => {
              const vt = vehicleType;
              const filteredModels =
                catalog === 'tire' || !vt
                  ? brand.models
                  : brand.models.filter((m) => m.vehicleTypes.includes(vt));
              return (
                <BrandRow
                  key={brand.id}
                  brand={brand}
                  catalog={catalog}
                  filteredModels={filteredModels}
                  isExpanded={expandedBrandIds.has(brand.id)}
                  onToggleExpand={() => toggleExpand(brand.id)}
                  onEditBrand={() => onEditBrand(brand)}
                  onEditModel={(model) => onEditModel(model, brand.name)}
                  setArchiveTarget={setArchiveTarget}
                  onUnarchiveBrand={() => onUnarchiveBrand(brand.id)}
                  onUnarchiveModel={onUnarchiveModel}
                  formatVehicleTypes={formatVehicleTypes}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </>
  );
}
