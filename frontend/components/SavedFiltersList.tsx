'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { savedFiltersApi, SavedFilter } from '@/lib/api';

import { SaveFilterModal } from './SaveFilterModal';

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

export function SavedFiltersList({ onFiltersChange }: SavedFiltersListProps = {}) {
  const router = useRouter();
  const { t } = useTranslation();
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
    [onFiltersChange]
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

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  const handleDelete = async (id: string) => {
    if (deletingIds.has(id)) return;

    setDeletingIds((prev) => new Set(prev).add(id));
    const previousFilters = filters;
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
      setFilters(previousFilters);
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
    }
  };

  const handleApply = (savedFilter: SavedFilter) => {
    const filterParams = savedFilter.filters;
    const params = new URLSearchParams();
    const currentYear = new Date().getFullYear().toString();

    Object.entries(filterParams).forEach(([key, value]) => {
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

      if (Array.isArray(value)) {
        const filteredArray = value.filter(
          (v) => v !== 'all' && v !== '' && v !== null && v !== undefined
        );
        if (filteredArray.length > 0) {
          const arrayParams = [
            'brand_ids',
            'model_ids',
            'cities',
            'fuels',
            'transmissions',
            'body_types',
            'colors',
            'doors',
            'conditions',
            'registration_types',
            'drive_types',
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
    router.push(`/?${queryString}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('mk-MK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-6 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (filters.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-300 text-lg">{t('savedFiltersList.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filters.map((filter, index) => (
        <div
          key={filter.id}
          onClick={() => handleApply(filter)}
          className="card p-4 md:p-5 cursor-pointer group hover:border-primary-500 transition-colors duration-200"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-primary-400">#{index + 1}</span>
                <h3 className="text-lg font-bold text-white group-hover:text-primary-600 transition-colors duration-200">
                  {filter.name}
                </h3>
              </div>
              <p className="text-sm text-gray-400">
                {t('savedFiltersList.created')}: {formatDate(filter.created_at)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingFilterId(filter.id);
                  setShowEditModal(true);
                }}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-primary-400 transition-colors duration-200"
                title={t('common.edit')}
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
                  handleDelete(filter.id);
                }}
                disabled={deletingIds.has(filter.id)}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-red-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('common.delete')}
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
