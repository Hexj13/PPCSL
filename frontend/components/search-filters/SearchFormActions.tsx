'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/lib/store';
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
  buttonsContainerRef: React.RefObject<HTMLDivElement>;
  showFadeButtons: boolean;
}

export function SearchFormActions({
  onReset,
  onSaveClick,
  hasFiltersChanged,
  isSyncingFromUrl,
  showSearchLoader,
  hasActiveFilters,
  canSaveFilter,
  buttonsContainerRef,
  showFadeButtons,
}: SearchFormActionsProps) {
  const { t } = useTranslation();
  const { user, isInitialized } = useAuthStore();
  const userForUi = user;

  return (
    <div className="mt-6 relative -mx-3 sm:mx-0 px-3 sm:px-0">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div ref={buttonsContainerRef} className="overflow-x-auto flex-1 relative">
          <div className="flex gap-3 items-stretch sm:items-center min-w-max sm:min-w-0">
            <LoadingButton
              type="submit"
              loading={showSearchLoader}
              loadingText={t('searchFilters.searching')}
              disabled={Boolean(!hasFiltersChanged || isSyncingFromUrl)}
              className={`w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 ${
                !hasFiltersChanged || isSyncingFromUrl ? '' : '!border-primary-500'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <svg
                  className="w-4 h-4 flex-shrink-0"
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
            <button
              type="button"
              onClick={onReset}
              disabled={Boolean(!hasActiveFilters)}
              className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
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
            {!isInitialized ? (
              <button
                type="button"
                disabled
                className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 opacity-50 !px-3 sm:!px-6"
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-300 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                <span className="whitespace-nowrap text-sm sm:text-base">
                  {t('common.loading')}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSaveClick}
                disabled={Boolean(!canSaveFilter)}
                className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 !px-3 sm:!px-6"
                title={!userForUi ? t('common.loginRequired') : ''}
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
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
                <span className="whitespace-nowrap text-sm sm:text-base">
                  {userForUi ? t('searchFilters.addToFavorites') : t('searchFilters.login')}
                </span>
              </button>
            )}
          </div>
          {showFadeButtons && (
            <div className="lg:hidden absolute right-0 top-0 bottom-0 w-24 pointer-events-none bg-gradient-to-l from-white via-white/60 to-transparent z-20" />
          )}
        </div>
        <div className="w-full sm:w-auto border-t border-primary-500/20 pt-3 sm:border-t-0 sm:pt-0 flex-shrink-0 relative">
          <SortDropdown />
        </div>
      </div>
    </div>
  );
}
