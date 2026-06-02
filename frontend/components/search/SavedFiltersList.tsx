'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

const SaveFilterModal = dynamic(
  () => import('@/components/modals/SaveFilterModal').then((m) => ({ default: m.SaveFilterModal })),
  { ssr: false },
);
import { useI18n } from '@/components/providers/I18nProvider';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import type { SavedFilter } from '@/lib/api';
import { brandsApi, savedFiltersApi } from '@/lib/api';
import { CARD_EXIT_ANIMATION_MS, MAX_SAVED_FILTERS } from '@/lib/constants';
import { toast } from '@/lib/toast';
import { createSlug, formatDateLong } from '@/lib/utils';

interface SavedFiltersListProps {
  onFiltersChange?: (_count: number) => void;
}

let moduleCache: SavedFilter[] | null = null;
let moduleHasLoaded = false;

export function updateSavedFiltersCache(filters: SavedFilter[]) {
  moduleCache = filters;
  moduleHasLoaded = true;
}

export function clearSavedFiltersCache() {
  moduleCache = null;
  moduleHasLoaded = false;
}

export async function resolveSavedFiltersCount(): Promise<number> {
  if (moduleHasLoaded && moduleCache !== null) {
    return moduleCache.length;
  }

  try {
    const res = await savedFiltersApi.getAll();
    const filtersList = Array.isArray(res.data) ? res.data : [];
    updateSavedFiltersCache(filtersList);
    return filtersList.length;
  } catch {
    return 0;
  }
}

export function isSavedFiltersLimitReached(count: number): boolean {
  return count >= MAX_SAVED_FILTERS;
}

export function SavedFiltersList({ onFiltersChange }: SavedFiltersListProps = {}) {
  const { push: localizedPush } = useLocalizedNavigation();
  const { t } = useTranslation();
  const { locale } = useI18n();
  const hasLoadedRef = useRef(moduleHasLoaded);
  const cachedFiltersRef = useRef<SavedFilter[] | null>(moduleCache);

  const loadFilters = useCallback(
    (forceReload = false, silent = false) => {
      if (!forceReload && hasLoadedRef.current && cachedFiltersRef.current !== null) {
        setFilters(cachedFiltersRef.current);
        setLoading(false);
        onFiltersChange?.(cachedFiltersRef.current.length);
        return;
      }

      if (!silent) {
        setLoading(true);
      }
      savedFiltersApi
        .getAll()
        .then((res) => {
          const filtersList = Array.isArray(res.data) ? res.data : [];
          cachedFiltersRef.current = filtersList;
          moduleCache = filtersList;
          hasLoadedRef.current = true;
          moduleHasLoaded = true;
          setFilters(filtersList);
          setLoading(false);
          onFiltersChange?.(filtersList.length);
        })
        .catch(() => {
          cachedFiltersRef.current = [];
          moduleCache = [];
          hasLoadedRef.current = true;
          moduleHasLoaded = true;
          setFilters([]);
          setLoading(false);
          onFiltersChange?.(0);
        });
    },
    [onFiltersChange],
  );

  const [filters, setFilters] = useState<SavedFilter[]>(() => {
    if (hasLoadedRef.current && cachedFiltersRef.current !== null) {
      return cachedFiltersRef.current;
    }
    return [];
  });

  const [loading, setLoading] = useState(() => {
    return !(hasLoadedRef.current && cachedFiltersRef.current !== null);
  });

  const { visible: showSavedFiltersSkeleton } = useLoadingState({
    isLoading: loading,
    showDelay: 200,
    minDisplayTime: 450,
  });

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  const handleDelete = async (id: string) => {
    if (deletingIds.has(id)) return;

    flushSync(() => {
      setDeletingIds((prev) => new Set(prev).add(id));
      setExitingIds((prev) => new Set(prev).add(id));
    });
    const previousFilters = filters;

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, CARD_EXIT_ANIMATION_MS);
        });
      });
    });

    setFilters((prev) => prev.filter((f) => f.id !== id));
    try {
      await savedFiltersApi.remove(id);
      toast.success(t('savedFiltersList.deleteSuccess'));
      cachedFiltersRef.current = null;
      moduleCache = null;
      hasLoadedRef.current = false;
      moduleHasLoaded = false;
      loadFilters(true, true);
    } catch (error: unknown) {
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setFilters((current) => {
        const removedFilter = previousFilters.find((f) => f.id === id);
        if (!removedFilter || current.some((f) => f.id === id)) {
          return current;
        }
        const originalIndex = previousFilters.findIndex((f) => f.id === id);
        let insertPos = 0;
        for (let i = 0; i < originalIndex; i++) {
          const precedingId = previousFilters[i].id;
          const idx = current.findIndex((f) => f.id === precedingId);
          if (idx !== -1) {
            insertPos = idx + 1;
          }
        }
        const next = [...current];
        next.splice(insertPos, 0, removedFilter);
        return next;
      });
      const errorMessage =
        (error && typeof error === 'object' && 'response' in error
          ? (error.response as { data?: { message?: string } })?.data?.message
          : null) || t('savedFiltersList.deleteError');
      toast.error(errorMessage);
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setExitingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleApply = async (savedFilter: SavedFilter): Promise<void> => {
    const filterParams = savedFilter.filters;
    const params = new URLSearchParams();
    const currentYear = new Date().getFullYear().toString();

    const vehicleType =
      typeof filterParams.vehicleType === 'string' ? filterParams.vehicleType : 'car';
    params.set('vehicleType', vehicleType);

    const brandIds = Array.isArray(filterParams.brand_ids)
      ? (filterParams.brand_ids as string[]).filter(
          (v) => v !== 'all' && v !== '' && v !== null && v !== undefined,
        )
      : [];
    const modelIds = Array.isArray(filterParams.model_ids)
      ? (filterParams.model_ids as string[]).filter(
          (v) => v !== 'all' && v !== '' && v !== null && v !== undefined,
        )
      : [];

    if (brandIds.length > 0 || modelIds.length > 0) {
      try {
        const brands = await brandsApi.getAll();
        const brandSlugs: string[] = [];

        if (brandIds.length > 0) {
          brandIds.forEach((brandId) => {
            const brand = brands.data.find((b) => b.id === brandId);
            if (brand) {
              brandSlugs.push(createSlug(brand.name));
            }
          });

          if (brandSlugs.length === 0 && brandIds.length > 0) {
            toast.error(t('savedFiltersList.applyError'));
            return;
          }
        }

        if (brandSlugs.length > 0) {
          params.set('brand', brandSlugs.join(','));
        }

        if (modelIds.length > 0 && brandIds.length > 0) {
          const modelsByBrand = await brandsApi.getModelsBatch(brandIds);
          const allModels = Object.values(modelsByBrand.data).flat();
          const modelSlugs: string[] = [];

          modelIds.forEach((modelId) => {
            const model = allModels.find((m) => m.id === modelId);
            if (model && brandIds.includes(model.brand_id)) {
              modelSlugs.push(createSlug(model.name));
            }
          });

          if (modelSlugs.length === 0 && modelIds.length > 0) {
            toast.error(t('savedFiltersList.applyError'));
            return;
          }

          if (modelSlugs.length > 0) {
            params.set('model', modelSlugs.join(','));
          }
        }
      } catch (error) {
        console.error('Failed to convert brand/model IDs to slugs:', error);
        toast.error(t('savedFiltersList.applyError'));
        return;
      }
    }

    Object.entries(filterParams).forEach(([key, value]) => {
      if (key === 'vehicleType') {
        return;
      }

      if (key === 'sortBy' || key === 'sortOrder') {
        if (value && value !== '' && value !== 'created_at' && value !== 'DESC') {
          params.set(key, String(value));
        }
        return;
      }

      if (key === 'year_lte') {
        if (value && value !== '' && value !== currentYear) {
          params.set(key, String(value));
        }
        return;
      }

      if (key === 'brand_ids' || key === 'model_ids') {
        return;
      }

      if (key === 'equipment_match_mode') {
        params.set('equipmentMatch', value === 'partial' ? 'partial' : 'full');
        return;
      }

      if (Array.isArray(value)) {
        const filteredArray = value.filter(
          (v) => v !== 'all' && v !== '' && v !== null && v !== undefined,
        );
        if (filteredArray.length > 0) {
          const arrayParams = [
            'cities',
            'fuels',
            'transmissions',
            'body_types',
            'colors',
            'doors',
            'conditions',
            'registration_types',
            'drive_types',
            'equipment',
          ];
          if (arrayParams.includes(key)) {
            params.set(key, filteredArray.join(','));
          } else {
            params.set(key, filteredArray.join(','));
          }
        }
      } else if (value !== '' && value !== undefined && value !== null) {
        if (typeof value === 'boolean') {
          if (value === true) {
            params.set(key, 'true');
          }
        } else {
          params.set(key, String(value));
        }
      }
    });

    const queryString = params.toString();
    localizedPush(`/?${queryString}`);
  };

  if (showSavedFiltersSkeleton) {
    return (
      <div className="space-y-4" data-testid="saved-filters-list">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-6 bg-gray-700 rounded-sm w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded-sm w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (filters.length === 0) {
    return (
      <div className="text-center py-12" data-testid="saved-filters-empty">
        <p className="text-text-secondary text-lg">{t('savedFiltersList.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="saved-filters-list">
      {filters.map((filter, index) => (
        <div
          key={filter.id}
          data-testid={`saved-filter-card-${filter.id}`}
          onClick={() => {
            handleApply(filter).catch((error) => {
              console.error('Failed to apply filter:', error);
            });
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleApply(filter).catch((error) => {
                console.error('Failed to apply filter:', error);
              });
            }
          }}
          style={{ transitionDuration: `${CARD_EXIT_ANIMATION_MS}ms` }}
          className={`saved-filter-card card p-4 md:p-5 cursor-pointer group bg-white rounded-xl border-2 border-primary-700/30 shadow-none transition-[opacity,transform] ease-out ${
            exitingIds.has(filter.id) ? 'opacity-0 scale-[0.97]' : ''
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-primary-700">#{index + 1}</span>
                <h3 className="text-lg font-bold text-primary-900 transition-colors duration-200">
                  {filter.name}
                </h3>
              </div>
              <p className="text-sm text-text-secondary">
                {t('savedFiltersList.created')}: {formatDateLong(filter.created_at, locale)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingFilterId(filter.id);
                  setShowEditModal(true);
                }}
                className="shrink-0 p-2 text-primary-700 hover-only:hover:text-primary-900 transition-colors duration-200"
                title={t('common.edit')}
                data-testid={`saved-filter-edit-${filter.id}`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete(filter.id);
                }}
                disabled={deletingIds.has(filter.id)}
                className="shrink-0 p-2 text-text-secondary hover-only:hover:text-red-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('common.delete')}
                data-testid={`saved-filter-delete-${filter.id}`}
              >
                {deletingIds.has(filter.id) ? (
                  <svg
                    className="w-6 h-6 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      ))}

      {editingFilterId && (
        <SaveFilterModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingFilterId(null);
          }}
          onSave={() => {
            cachedFiltersRef.current = null;
            moduleCache = null;
            hasLoadedRef.current = false;
            moduleHasLoaded = false;
            loadFilters(true, true);
          }}
          filterId={editingFilterId}
          initialName={filters.find((f) => f.id === editingFilterId)?.name || ''}
        />
      )}
    </div>
  );
}
