import type { useSearchParams } from 'next/navigation';
import {
  useEffect,
  useRef,
  startTransition,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import { RESET_SEARCH_EVENT } from '@/components/layout/Header/HeaderLogo';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { clearInternalSearchNavigation } from '@/hooks/useSearchFilters';
import type { FilterState, InternalSearchNavigationState } from '@/hooks/useSearchFilters';
import type { useSearchTabs } from '@/hooks/useSearchTabs';
import type { User } from '@/lib/api';
import { buildMinimalCategorySearchUrl } from '@/lib/search';

type SearchTabsApi = ReturnType<typeof useSearchTabs>;

type UseSearchFiltersControllerLifecycleParams = {
  searchParams: ReturnType<typeof useSearchParams>;
  isSearching: boolean;
  setIsSearching: Dispatch<SetStateAction<boolean>>;
  prevSearchParamsRef: MutableRefObject<string>;
  user: User | null;
  resetFilters: () => void;
  setLastAppliedFilters: Dispatch<SetStateAction<FilterState | null>>;
  setIsHydrated: Dispatch<SetStateAction<boolean>>;
  resetToVehicleSearchDefaults: () => void;
  tabs: SearchTabsApi;
  setVehicleTypeWithStorage: (type: 'car' | 'truck' | 'moto') => void;
  scrollTabsToStart: () => void;
  internalSearchNavigationRef: MutableRefObject<InternalSearchNavigationState>;
};

export function useSearchFiltersControllerLifecycle({
  searchParams,
  isSearching,
  setIsSearching,
  prevSearchParamsRef,
  user,
  resetFilters,
  setLastAppliedFilters,
  setIsHydrated,
  resetToVehicleSearchDefaults,
  tabs,
  setVehicleTypeWithStorage,
  scrollTabsToStart,
  internalSearchNavigationRef,
}: UseSearchFiltersControllerLifecycleParams): void {
  const { replace: localizedReplace } = useLocalizedNavigation();
  const prevUserRef = useRef<User | null>(user);

  useEffect(() => {
    const handler = () => {
      clearInternalSearchNavigation(internalSearchNavigationRef);
      resetToVehicleSearchDefaults();
      setLastAppliedFilters(null);
      tabs.setActiveTab('basic');
      setVehicleTypeWithStorage('car');
      scrollTabsToStart();
    };
    window.addEventListener(RESET_SEARCH_EVENT, handler);
    return () => window.removeEventListener(RESET_SEARCH_EVENT, handler);
  }, [
    resetToVehicleSearchDefaults,
    tabs,
    setVehicleTypeWithStorage,
    scrollTabsToStart,
    setLastAppliedFilters,
    internalSearchNavigationRef,
  ]);

  useEffect(() => {
    setIsHydrated(true);
  }, [setIsHydrated]);

  useEffect(() => {
    const currentParams = searchParams.toString();
    if (isSearching && currentParams !== prevSearchParamsRef.current) {
      setIsSearching(false);
    }
    prevSearchParamsRef.current = currentParams;
  }, [searchParams, isSearching, prevSearchParamsRef, setIsSearching]);

  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (prevUser && !user) {
      clearInternalSearchNavigation(internalSearchNavigationRef);
      resetFilters();
      if (searchParams.toString()) {
        startTransition(() => {
          localizedReplace('/');
        });
      }
    }
  }, [user, localizedReplace, searchParams, resetFilters, internalSearchNavigationRef]);

  useEffect(() => {
    const handleResetEvent = () => {
      clearInternalSearchNavigation(internalSearchNavigationRef);
      resetFilters();
      setLastAppliedFilters(null);
      const nextPath = buildMinimalCategorySearchUrl(new URLSearchParams(window.location.search));
      startTransition(() => {
        localizedReplace(nextPath, { scroll: false });
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resetFiltersFromListingGrid', handleResetEvent);
      return () => {
        window.removeEventListener('resetFiltersFromListingGrid', handleResetEvent);
      };
    }
  }, [localizedReplace, resetFilters, setLastAppliedFilters, internalSearchNavigationRef]);
}
