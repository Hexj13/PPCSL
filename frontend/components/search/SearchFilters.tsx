'use client';

import { SearchFiltersForm } from '@/components/search/search-filters/SearchFiltersForm';
import {
  useSearchFiltersController,
  type SearchFiltersControllerProps,
} from '@/hooks/useSearchFiltersController';

export function SearchFilters(props: SearchFiltersControllerProps = {}) {
  const formProps = useSearchFiltersController(props);
  return <SearchFiltersForm {...formProps} />;
}
