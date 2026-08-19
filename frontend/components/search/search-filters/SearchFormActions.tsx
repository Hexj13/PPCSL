'use client';

import { SmartSelectionIcon } from '@/components/layout/Header/icons';
import {
  isSavedFiltersLimitReached,
  resolveSavedFiltersCount,
} from '@/components/search/SavedFiltersList';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { MAX_SAVED_FILTERS } from '@/lib/constants';
import { buildSignInHref } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { LoadingButton } from '@/ui';

import { SortDropdown } from '../SortDropdown';

interface SearchFormActionsProps {
  onReset: () => void;
  onSaveClick: () => void;
  hasFiltersChanged: boolean;
  isSyncingFromUrl: boolean;
  showSearchLoader: boolean;
  hasActiveFilters: boolean;
  canSaveFilter: boolean;
  availableListingsTotal: number | null;
  isAvailableListingsLoading: boolean;
  buttonsContainerRef: React.RefObject<HTMLDivElement | null>;
  isInternalSearchRef?: React.MutableRefObject<boolean>;
  selectedSortKey?: string;
  onSortChange?: (sortBy: string, sortOrder: 'ASC' | 'DESC') => void;
}

export function SearchFormActions({
  onReset,
  onSaveClick,
  hasFiltersChanged,
  isSyncingFromUrl,
  showSearchLoader,
  hasActiveFilters,
  canSaveFilter,
  availableListingsTotal,
  isAvailableListingsLoading,
  buttonsContainerRef,
  isInternalSearchRef,
  selectedSortKey,
  onSortChange,
}: SearchFormActionsProps) {
  const { t } = useTranslation();
  const { push: localizedPush } = useLocalizedNavigation();
  const { user, isInitialized } = useAuthStore();
  const userForUi = isInitialized ? user : null;

  const handleSmartSelectionClick = async () => {
    if (!userForUi) {
      localizedPush(buildSignInHref('/smart-selection'));
      return;
    }

    const savedFiltersCount = await resolveSavedFiltersCount();
    if (isSavedFiltersLimitReached(savedFiltersCount)) {
      toast.error(
        t('searchFilters.smartSelectionFilterLimitError', {
          max: String(MAX_SAVED_FILTERS),
        }),
      );
      return;
    }

    localizedPush('/smart-selection');
  };

  const isSearchReady = Boolean(hasFiltersChanged && !isSyncingFromUrl);

  return (
    <div className="mt-4 relative -mx-3 sm:mx-0 px-3 sm:px-0">
      <div className="flex flex-col xl:flex-row xl:flex-nowrap xl:justify-between gap-3 items-stretch xl:items-end">
        <div className="w-full xl:w-[280px] xl:shrink-0 relative">
          <div
            className="w-full flex justify-start items-center gap-2 pb-2 min-h-[1.5rem]"
            aria-live="polite"
            data-testid="search-available-listings"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <svg
                className="h-4 w-4 shrink-0 text-primary-900"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9.29289 1.29289C9.48043 1.10536 9.73478 1 10 1H18C19.6569 1 21 2.34315 21 4V8C21 8.55228 20.5523 9 20 9C19.4477 9 19 8.55228 19 8V4C19 3.44772 18.5523 3 18 3H11V8C11 8.55228 10.5523 9 10 9H5V20C5 20.5523 5.44772 21 6 21H10C10.5523 21 11 21.4477 11 22C11 22.5523 10.5523 23 10 23H6C4.34315 23 3 21.6569 3 20V8C3 7.73478 3.10536 7.48043 3.29289 7.29289L9.29289 1.29289ZM6.41421 7H9V4.41421L6.41421 7ZM20.1716 18.7574C20.6951 17.967 21 17.0191 21 16C21 13.2386 18.7614 11 16 11C13.2386 11 11 13.2386 11 16C11 18.7614 13.2386 21 16 21C17.0191 21 17.967 20.6951 18.7574 20.1716L21.2929 22.7071C21.6834 23.0976 22.3166 23.0976 22.7071 22.7071C23.0976 22.3166 23.0976 21.6834 22.7071 21.2929L20.1716 18.7574ZM13 16C13 14.3431 14.3431 13 16 13C17.6569 13 19 14.3431 19 16C19 17.6569 17.6569 19 16 19C14.3431 19 13 17.6569 13 16Z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-sm text-primary-900 truncate">
                {t('searchFilters.availableListingsLabel')}
              </span>
            </span>
            <span className="inline-flex items-center shrink-0">
              {isAvailableListingsLoading || availableListingsTotal === null ? (
                <span className="w-4 h-4 border-2 border-primary-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-sm font-semibold text-primary-700 tabular-nums">
                  {availableListingsTotal ?? 0}
                </span>
              )}
            </span>
          </div>
          <SortDropdown
            selectedSortKey={selectedSortKey}
            isInternalSearchRef={isInternalSearchRef}
            onSortChange={onSortChange}
          />
        </div>
        <div className="min-w-0 relative border-t border-primary-500/20 pt-3 xl:border-t-0 xl:pt-0">
          <div ref={buttonsContainerRef} className="xl:overflow-x-auto xl:scrollbar-hide">
            <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center xl:min-w-max">
              {!isInitialized ? (
                <button
                  type="button"
                  disabled
                  className="w-full btn-secondary flex items-center justify-center gap-2 opacity-50 px-3! xl:px-6! text-primary-900!"
                >
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-300 border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <span className="whitespace-nowrap text-base">{t('common.loading')}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSmartSelectionClick}
                    className="w-full btn-secondary flex items-center justify-center gap-2 px-3! xl:px-6! text-primary-900!"
                    title={!userForUi ? t('common.loginRequired') : ''}
                    data-testid="search-smart-selection"
                  >
                    <SmartSelectionIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="whitespace-nowrap text-base">
                      {t('searchFilters.smartSelection')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onSaveClick}
                    disabled={Boolean(!canSaveFilter)}
                    className="w-full btn-secondary flex items-center justify-center gap-2 px-3! xl:px-6! text-primary-900!"
                    title={!userForUi ? t('common.loginRequired') : ''}
                    data-testid="search-save-filter"
                  >
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    <span className="whitespace-nowrap text-base">
                      {t('searchFilters.addToFavorites')}
                    </span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onReset}
                disabled={Boolean(!hasActiveFilters)}
                className="w-full btn-secondary flex items-center justify-center gap-2 whitespace-nowrap text-primary-900!"
                data-testid="search-reset"
              >
                <svg
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.85355 2.14645C5.04882 2.34171 5.04882 2.65829 4.85355 2.85355L3.70711 4H9C11.4853 4 13.5 6.01472 13.5 8.5C13.5 10.9853 11.4853 13 9 13H5C4.72386 13 4.5 12.7761 4.5 12.5C4.5 12.2239 4.72386 12 5 12H9C10.933 12 12.5 10.433 12.5 8.5C12.5 6.567 10.933 5 9 5H3.70711L4.85355 6.14645C5.04882 6.34171 5.04882 6.65829 4.85355 6.85355C4.65829 7.04882 4.34171 7.04882 4.14645 6.85355L2.14645 4.85355C1.95118 4.65829 1.95118 4.34171 2.14645 4.14645L4.14645 2.14645C4.34171 1.95118 4.65829 1.95118 4.85355 2.14645Z"
                    fill="currentColor"
                  />
                </svg>
                {t('searchFilters.reset')}
              </button>
              <LoadingButton
                type="submit"
                loading={showSearchLoader}
                loadingText={t('searchFilters.searching')}
                data-testid="search-submit"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.blur();
                }}
                className={`relative box-border h-[52px] max-h-[52px] min-h-[52px] w-full overflow-hidden rounded-lg px-6 font-semibold text-base outline-hidden select-none border-2 transition-colors duration-200 text-primary-900! ${
                  isSearchReady
                    ? 'border-primary-700 bg-primary-500/12'
                    : 'border-primary-700/30 bg-bg-secondary hover-only:hover:border-primary-700'
                }`}
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {t('searchFilters.search')}
                </span>
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
